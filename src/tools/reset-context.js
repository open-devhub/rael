import { tool, zodSchema } from "ai";
import { z } from "zod";
import { clearUserContext } from "../utils/chat-context.js";

export function createResetContextTool(userId) {
  return tool({
    description:
      "Reset this user's conversation context. Use this if the AI is stuck or the user asks to clear memory.",
    inputSchema: zodSchema(
      z.object({
        reason: z
          .string()
          .optional()
          .describe("Optional reason for resetting the context."),
      }),
    ),
    execute: async ({ reason }) => {
      const cleared = clearUserContext(userId);
      return {
        success: true,
        cleared,
        reason: reason || null,
      };
    },
  });
}
