import { tool } from "ai";
import { z } from "zod";
import { client } from "../index.ts";

export const react = tool({
  description: "React to a Discord message using its message ID and an emoji.",
  inputSchema: z.object({
    channelId: z
      .string()
      .describe("The ID of the channel where the message is located."),
    messageId: z
      .string()
      .describe("The ID of the specific message to react to."),
    emoji: z
      .string()
      .describe("The emoji to react with (e.g., '👍', '🔥', etc)."),
  }),
  execute: async ({ channelId, messageId, emoji }) => {
    try {
      const channel = await client.channels.fetch(channelId);

      if (!channel || !channel.isTextBased()) {
        return {
          success: false,
          error: "Channel not found or is not a text-based channel.",
        };
      }

      const discordMessage = await channel.messages.fetch(messageId);

      if (!discordMessage) {
        return { success: false, error: "Message not found." };
      }

      await discordMessage.react(emoji);

      return {
        success: true,
        message: `Successfully reacted with ${emoji} to message ${messageId}.`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          (error instanceof Error ? error.message : error) ||
          "An unknown error occurred while adding the reaction.",
      };
    }
  },
});
