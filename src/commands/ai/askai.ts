import { groq } from "@ai-sdk/groq";
import { generateText, stepCountIs } from "ai";
import { MAX_QUESTION_CHARS } from "../../constants/askai.ts";
import { MODELS, VISION_MODEL_ID } from "../../constants/model.ts";
import { SYSTEM_PROMPT } from "../../prompts/base.ts";
import { tools } from "../../tools/index.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { openRouter } from "../../utils/ai.ts";
import { addToContext, getContext } from "../../utils/context.ts";
import { pretty } from "../../utils/pretty.ts";
import { sanitizeForPrompt } from "../../utils/sanitize.ts";
import { recordUsage } from "../../utils/stats.ts";
import { canUseAI, formatTimeLeft, setUsage } from "../../utils/usage.ts";

export let CURRENT_MODEL_INDEX = 0;

export default {
  name: "askai",
  description: "Ask the AI model",
  aliases: ["ai", "ask"],
  async execute({ message, args, ctx }: CommandCallbackOpts) {
    if (message.author.bot) return;

    if ((message as any)._processedByAskai) return;
    (message as any)._processedByAskai = true;

    const { imageUrl, mimeType } = getAttachmentData(message);
    const question = parseQuestion(args, !!imageUrl);

    if (!question && !imageUrl) return;

    if (question.length > MAX_QUESTION_CHARS) {
      await message.reply(
        `Your message is too long. Please keep it under ${MAX_QUESTION_CHARS} characters.`,
      );
      return;
    }

    const userId = message.author.id;
    const { allowed, tokensUsed, msUntilReset } = await canUseAI(userId);

    if (!allowed) {
      const timeLeft = formatTimeLeft(msUntilReset);
      await message.reply(
        `You have finished your hourly token limit (${tokensUsed} tokens used). ` +
          `Please try again after an hour (${timeLeft} remaining).`,
      );
      return;
    }

    if ("sendTyping" in message?.channel) await message.channel.sendTyping();

    const contentBlocks = buildContentBlocks(question, imageUrl, mimeType);
    let systemPrompt =
      SYSTEM_PROMPT +
      `\n- Current Channel ID: "${message.channelId}"\n- Current Message ID: "${message.id}"`;

    if (ctx) {
      systemPrompt += `\n\nThe user is replying to this message (your message):\n"${sanitizeForPrompt(ctx)}"`;
    }

    const history = getContext(userId);
    addToContext(userId, "user", question);

    const messages = [
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user" as const, content: question },
    ];

    const result = await executeAiRequest(
      contentBlocks,
      systemPrompt,
      !!imageUrl,
      messages,
    );

    if (result?.text) {
      addToContext(userId, "assistant", result.text);

      await message.reply({
        content: pretty(result.text),
      });

      /// token usage
      const tokensUsedByModel = result.usage?.totalTokens ?? 0;
      if (tokensUsedByModel > 0) {
        await setUsage(userId, tokensUsedByModel);
      }

      // stats

      const profile = {
        username: message.author.username,
        displayName: message.author.displayName,
        avatar: message.author.displayAvatarURL({
          extension: "png",
          size: 256,
        }),
      };

      recordUsage(userId, profile, tokensUsedByModel).catch((err) => {
        console.error("[Stats] Failed to record usage:", err);
      });
    } else {
      await message.reply(
        "Sorry, I encountered an issue processing your request right now.",
      );
    }
  },
};

function getAttachmentData(message: any) {
  const attachment = message.attachments?.first();
  const mimeType = attachment?.contentType || "";
  const isImage = mimeType.startsWith("image/");

  return {
    imageUrl: isImage ? attachment.url : null,
    mimeType,
  };
}

function parseQuestion(args: string[], hasImage: boolean): string {
  const question = args.join(" ").trim();
  if (!question && hasImage) {
    return "Describe the following image";
  }
  return question;
}

function buildContentBlocks(
  question: string,
  imageUrl: string | null,
  mimeType: string,
) {
  const blocks: any[] = [{ type: "text", text: question }];

  if (imageUrl) {
    blocks.push({
      type: "file",
      data: imageUrl,
      mediaType: mimeType,
    });
  }

  return blocks;
}

async function executeAiRequest(
  contentBlocks: any[],
  systemPrompt: string,
  isVisionRequest: boolean,
  messages?: any[],
) {
  let attempts = 0;
  let success = false;
  let result = null;

  while (attempts < MODELS.length && !success) {
    const modelConfig = MODELS[CURRENT_MODEL_INDEX];

    if (!modelConfig || !modelConfig.id) {
      CURRENT_MODEL_INDEX = (CURRENT_MODEL_INDEX + 1) % MODELS.length;
      attempts++;
      continue;
    }

    try {
      const modelId = isVisionRequest
        ? VISION_MODEL_ID
        : (modelConfig.id as string);
      const provider = isVisionRequest
        ? groq
        : modelConfig.provider === "groq"
          ? groq
          : openRouter;

      result = await generateText({
        model: provider(modelId),
        system: systemPrompt,
        messages: messages || [{ role: "user", content: contentBlocks }],
        temperature: 0.9,
        maxOutputTokens: 1024,
        topP: 1,
        stopWhen: stepCountIs(3),
        tools: tools,
        toolChoice: "auto",
      });

      success = true;

      // console.log({ provider, modelId });
    } catch (error) {
      console.error(
        `[FAIL] Model [${isVisionRequest ? "Vision Model" : modelConfig.name}] hit an exception or quota limit. Error:`,
        error,
      );

      if (isVisionRequest) {
        break;
      }

      CURRENT_MODEL_INDEX = (CURRENT_MODEL_INDEX + 1) % MODELS.length;
      attempts++;
    }
  }

  return success ? result : null;
}

export function resetIndex() {
  CURRENT_MODEL_INDEX = 0;
}
