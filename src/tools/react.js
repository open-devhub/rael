import { tool } from "ai";
import { z } from "zod";
// Assuming you have your Discord client exported from a config file
import { client } from "../index.js";

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
      .describe(
        "The emoji to react with (e.g., '👍', '🔥', or a custom emoji ID).",
      ),
  }),
  execute: async ({ channelId, messageId, emoji }) => {
    try {
      // 1. Fetch the channel from the Discord client cache or API
      const channel = await client.channels.fetch(channelId);

      if (!channel || !channel.isTextBased()) {
        return {
          success: false,
          error: "Channel not found or is not a text-based channel.",
        };
      }

      // 2. Fetch the specific message
      const discordMessage = await channel.messages.fetch(messageId);

      if (!discordMessage) {
        return { success: false, error: "Message not found." };
      }

      // 3. React to the message
      await discordMessage.react(emoji);

      return {
        success: true,
        message: `Successfully reacted with ${emoji} to message ${messageId}.`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error?.message ||
          "An unknown error occurred while adding the reaction.",
      };
    }
  },
});
