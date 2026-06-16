import { generateText, stepCountIs } from "ai";
import { AttachmentBuilder } from "discord.js";
import "dotenv/config";
import {
  IMAGE_GEN_WINDOW_MS,
  MAX_QUESTION_CHARS,
  REFUSAL_MESSAGE,
  VISION_MODEL_ID,
} from "../../prompt-messages/prompts.js";
import { generateImage } from "../../tools/generate-image.js";
import { searchTool } from "../../tools/get-search.js";
import { stockTool } from "../../tools/get-stock.js";
import { createResetContextTool } from "../../tools/reset-context.js";
import { groq, openRouter } from "../../utils/ai.js";
import { clearUserContext } from "../../utils/chat-context.js";
import { buildConversation, updateUserContext } from "../../utils/context.js";
import { getImageAttachments, isImageRequest } from "../../utils/image.js";
import { DEFAULT_MODEL_ID, getUserModel } from "../../utils/model.js";
import { getUserPersonaPrompt } from "../../utils/persona.js";
import { buildSystemPrompt, sendStockCards } from "../../utils/system.js";
import {
  applyOutputGuardrails,
  getBestAnswer,
  isSafeInput,
  splitToChunks,
  wasToolUsed,
} from "../../utils/text.js";
import { recordUsage } from "../../utils/user-stats.js";
let lastImageGenAt = 0; // epoch ms when next image gen is permitted

export default {
  name: "askai",
  description: "Ask the AI model",
  aliases: ["ai"],
  callback: async (client, message, args) => {
    try {
      if (message.author.bot) return;
      await message.channel.sendTyping();

      const question = args.join(" ");
      const imageAttachments = getImageAttachments(message);

      // Allow image-only messages (no text) since the model can describe them.
      if (!question && !imageAttachments.length) {
        await message.reply(
          [
            "Please provide a question.",
            "",
            "Quick usage:",
            "1. `$ai explain promises in javascript`",
            "2. `$ai reset` to clear your AI context",
            "3. `$resetai` also works",
            "4. `$persona list` and `$persona set debugcoach`",
            "5. `$model list` to pick a model",
          ].join("\n"),
        );
        return;
      }

      const normalizedQuestion = question.trim().toLowerCase();
      if (
        ["reset", "clear", "reset context", "clear context"].includes(
          normalizedQuestion,
        )
      ) {
        const didClear = clearUserContext(message.author.id);
        await message.reply(
          didClear
            ? "Your AI conversation context has been cleared."
            : "No AI conversation context was found to clear.",
        );
        return;
      }

      if (question.length > MAX_QUESTION_CHARS) {
        await message.reply(
          `Your message is too long. Keep it under ${MAX_QUESTION_CHARS} characters.`,
        );
        return;
      }

      if (!isSafeInput(question)) {
        await message.reply(REFUSAL_MESSAGE);
        return;
      }

      // if user asks to generate image
      if (isImageRequest(question)) {
        const now = Date.now();
        if (now < lastImageGenAt) {
          await message.reply(
            `Image generation rate limit exceeded. Please try again in a minute.`,
          );
          return;
        }

        lastImageGenAt = now + IMAGE_GEN_WINDOW_MS;

        const { persona, prompt: personaPrompt } = getUserPersonaPrompt(
          message.author.id,
        );
        const systemPrompt = buildSystemPrompt(persona, personaPrompt);

        const imageBuffer = await generateImage(question);
        if (!imageBuffer) {
          await message.reply("Failed to generate image.");
          return;
        }

        try {
          // const captionResult = await generateText({
          //   model: groq(DEFAULT_MODEL_ID),
          //   system: systemPrompt,
          //   messages: [
          //     {
          //       role: "user",
          //       content: `Write a single concise caption starting with "Here is a picture of" for the following image prompt: "${question}"`,
          //     },
          //   ],
          //   temperature: 0.7,
          //   maxOutputTokens: 32,
          // });

          const captionResult = await generateText({
            model: groq(DEFAULT_MODEL_ID),
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: `Write a single concise caption starting with "Here is a picture of" for the following image prompt: "${question}". Do not include any additional commentary or explanation. Just provide the caption text for the exact prompt that the user asked for.`,
              },
            ],
            temperature: 0.7,
            maxOutputTokens: 150,
            providerOptions: {
              groq: {
                reasoningEffort: "low",
              },
            },
          });

          const caption = captionResult?.text?.trim();
          const attachment = new AttachmentBuilder(imageBuffer, {
            name: "generated.png",
          });

          await message.channel.send({
            content: caption,
            files: [attachment],
            allowedMentions: { parse: [] },
          });

          updateUserContext(message.author.id, question, caption);
          return;
        } catch (err) {
          console.error("Image caption generation failed:", err);
          await message.reply("Image generated but failed to create caption.");
          return;
        }
      }

      const conversation = await buildConversation(
        message,
        question,
        imageAttachments,
      );
      const { persona, prompt: personaPrompt } = getUserPersonaPrompt(
        message.author.id,
      );
      const systemPrompt = buildSystemPrompt(persona, personaPrompt);

      // Images require a multimodal model, so override the user's choice and
      // route through OpenRouter's vision-capable model instead.
      const selectedModel = imageAttachments.length
        ? { id: VISION_MODEL_ID, provider: "openrouter" }
        : getUserModel(message.author.id) || {
            id: DEFAULT_MODEL_ID,
            provider: "groq",
          };
      if (
        selectedModel.provider === "openrouter" &&
        !process.env.OPENROUTER_API_KEY
      ) {
        await message.reply(
          "OpenRouter is not configured yet. Add OPENROUTER_API_KEY to your environment and restart the bot.",
        );
        return;
      }
      const modelProvider =
        selectedModel.provider === "openrouter" ? openRouter : groq;

      const result = await generateText({
        model: modelProvider(selectedModel.id),
        system: systemPrompt,
        messages: conversation,

        temperature: 0.9,
        maxOutputTokens: 1024,
        topP: 1,
        stopWhen: stepCountIs(5),
        tools: {
          search: searchTool,
          stock: stockTool,
          resetContext: createResetContextTool(message.author.id),
        },
      });

      const answer = applyOutputGuardrails(getBestAnswer(result));

      const paragraphs = answer.split("\n\n");
      const messageParts = [];
      let currentPart = "";

      for (const para of paragraphs) {
        const paraWithSep = currentPart ? "\n\n" + para : para;
        if (currentPart.length + paraWithSep.length > 2000) {
          if (currentPart) {
            messageParts.push(currentPart.trim());
            currentPart = para;
          } else {
            const chunks = splitToChunks(para, 2000);
            messageParts.push(...chunks);
          }
        } else {
          currentPart += paraWithSep;
        }
      }
      if (currentPart) {
        messageParts.push(currentPart.trim());
      }

      for (const part of messageParts) {
        await message.channel.send({
          content: part,
          allowedMentions: { parse: [] },
        });
      }

      // If the AI looked up a stock, render and attach a visual price card.
      await sendStockCards(message, result);

      const usedResetContext = wasToolUsed(result, "resetContext");
      if (!usedResetContext) {
        updateUserContext(message.author.id, question, answer);
      }

      // Track token usage for the `$stats` card. Best-effort: never block or
      // fail the response if persistence has an issue.
      const totalTokens = Number(result?.totalUsage?.totalTokens) || 0;
      recordUsage(
        message.author.id,
        {
          username: message.author.username,
          displayName: message.member?.displayName || message.author.username,
          avatar: message.author.displayAvatarURL?.({
            extension: "png",
            size: 256,
          }),
        },
        totalTokens,
      ).catch((err) => console.error("Failed to record usage stats:", err));
    } catch (err) {
      console.log(err);

      const errorMessage = String(err?.message || err);
      if (errorMessage.includes("EXA_API_KEY")) {
        await message.reply(
          "Search is not configured yet. Add EXA_API_KEY to your environment and restart the bot.",
        );
        return;
      }

      await message.reply("Something went wrong while generating a response.");
    }
  },
};
