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

    const currentUserContent = imageUrl ? contentBlocks : question;

    const messages = [
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user" as const, content: currentUserContent },
    ];

    let result = await executeAiRequest(systemPrompt, !!imageUrl, messages);

    if (!result?.text && imageUrl && question) {
      const fallbackMessages = [
        ...history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user" as const, content: question },
      ];

      result = await executeAiRequest(
        systemPrompt +
          `\n\n(Note: an image was attached but could not be processed. Answer based on the text only, and briefly mention you couldn't view the image.)`,
        false,
        fallbackMessages,
      );
    }

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
  const attachment = message.attachments?.find((a: any) =>
    a.contentType?.startsWith("image/"),
  );

  return {
    imageUrl: attachment?.url ?? null,
    mimeType: attachment?.contentType ?? "",
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
  systemPrompt: string,
  isVisionRequest: boolean,
  messages: any[],
) {
  if (isVisionRequest) {
    for (let i = 0; i < 2; i++) {
      try {
        const result = await generateText({
          model: groq(VISION_MODEL_ID),
          system: systemPrompt,
          messages,
          temperature: 0.9,
          maxOutputTokens: 1024,
          topP: 1,
          stopWhen: stepCountIs(5),
          tools,
          toolChoice: "auto",
        });

        if (result.text) return result;
        console.error("[FAIL] Vision model returned no text, attempt", i + 1);
      } catch (error) {
        console.error("[FAIL] Vision model exception, attempt", i + 1, error);
      }
    }
    return null;
  }

  const startIndex = CURRENT_MODEL_INDEX;
  const tried = new Set<number>();
  let lastGoodIndex: number | null = null;

  for (let step = 0; step < MODELS.length; step++) {
    const index = (startIndex + step) % MODELS.length;
    if (tried.has(index)) continue;
    tried.add(index);

    const modelConfig = MODELS[index];
    if (!modelConfig || !modelConfig.id) continue;

    try {
      const provider = modelConfig.provider === "groq" ? groq : openRouter;

      const result = await generateText({
        model: provider(modelConfig.id as string),
        system: systemPrompt,
        messages,
        temperature: 0.9,
        maxOutputTokens: 1024,
        topP: 1,
        stopWhen: stepCountIs(5),
        tools,
        toolChoice: "auto",
      });

      if (!result.text) {
        console.error(
          `[FAIL] Model [${modelConfig.name}] returned no text, trying next.`,
        );
        continue;
      }

      lastGoodIndex = index;
      CURRENT_MODEL_INDEX = (index + 1) % MODELS.length;
      return result;
    } catch (error) {
      console.error(
        `[FAIL] Model [${modelConfig.name}] hit an exception or quota limit. Error:`,
        error,
      );
    }
  }

  if (lastGoodIndex === null) {
    CURRENT_MODEL_INDEX = (startIndex + 1) % MODELS.length;
  }

  return null;
}

export function resetIndex() {
  CURRENT_MODEL_INDEX = 0;
}
