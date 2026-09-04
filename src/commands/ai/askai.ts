import { groq } from "@ai-sdk/groq";
import { generateText, stepCountIs } from "ai";
import type { ModelMessage } from "ai";
import { MAX_QUESTION_CHARS } from "../../constants/askai.ts";
import { MODELS } from "../../constants/model.ts";
import { SYSTEM_PROMPT } from "../../prompts/base.ts";
import { tools } from "../../tools/index.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { openRouter } from "../../utils/ai.ts";
import { addToContext, getContext } from "../../utils/context.ts";
import { pretty } from "../../utils/pretty.ts";
import { sanitizeForPrompt } from "../../utils/sanitize.ts";
import { recordUsage } from "../../utils/stats.ts";
import { canUseAI, formatTimeLeft, setUsage } from "../../utils/usage.ts";

// === FIXED INTERACTION CONFIGS ===
import { Cache } from "../../utils/cache.ts";
const semanticCache = new Cache();

const processedMessages = new WeakSet<object>();

type ChatMessages = ModelMessage[];

export default {
  name: "askai",
  description: "Ask the AI model",
  aliases: ["ai", "ask"],
  async execute({ message, args, ctx }: CommandCallbackOpts) {
    if (message.author.bot) return;
    if (processedMessages.has(message)) return;
    processedMessages.add(message);

    const question = args.join(" ").trim();
    if (!question) return;

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

    try {
      if (message.channel && "sendTyping" in message.channel) {
        await message.channel.sendTyping();
      }
    } catch (error) {
      console.error("[askai] Failed to send typing indicator:", error);
    }

    try {
      let systemPrompt =
        SYSTEM_PROMPT +
        `\n- Current Channel ID: "${message.channelId}"\n- Current Message ID: "${message.id}"`;

      if (ctx) {
        systemPrompt += `\n\nThe user is replying to this message (your message):\n"${sanitizeForPrompt(ctx)}"`;
      }

      const history = getContext(userId);

      const hasHistory = Array.isArray(history) && history.length > 0;
      if (!hasHistory && !ctx) {
        const cachedAnswer = await semanticCache.get(question);
        if (cachedAnswer) {
          console.log(`⚡ [Semantic Cache Hit] Found a close match for: "${question}"`);

          addToContext(userId, "user", question);
          addToContext(userId, "assistant", cachedAnswer);
          
          await message.reply({ content: pretty(cachedAnswer) });
          return; 
        }
      }

     
      addToContext(userId, "user", question);

      const messages: ChatMessages = [
        ...(Array.isArray(history)
          ? history.map(({ role, content }) => ({ role, content }))
          : []),
        { role: "user", content: question },
      ];

      const result = await executeAiRequest(systemPrompt, messages);

      if (!result?.text) {
        await message.reply(
          "All models are currently rate-limited or unavailable. Please try again in a bit.",
        );
        return;
      }


      if (!hasHistory && !ctx) {
        await semanticCache.set(question, result.text);
        console.log(` [ Cahe Stored] Saved new query mapping to local db.`);
      }

      addToContext(userId, "assistant", result.text);
      await message.reply({ content: pretty(result.text) });

      const tokensUsedByModel = result.usage?.totalTokens ?? 0;
      if (tokensUsedByModel > 0) {
        await setUsage(userId, tokensUsedByModel);
      }

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
    } catch (error) {
      console.error("[askai] Unexpected error while handling request:", error);
      await message
        .reply(
          "Sorry, I encountered an issue processing your request right now.",
        )
        .catch(() => {});
    }
  },
};

async function executeAiRequest(systemPrompt: string, messages: ChatMessages) {
  for (let index = 0; index < MODELS.length; index++) {
    const modelId = MODELS[index];
    if (!modelId) continue;

    try {
      const provider = modelId.includes(":") ? openRouter : groq;

      const result = await generateText({
        model: provider(modelId),
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
          `[askai] Model "${modelId}" returned no text, trying next.`,
        );
        continue;
      }

      return result;
    } catch (error) {
      console.error(`[askai] Model "${modelId}" failed:`, error);
    }
  }

  return null;
}
