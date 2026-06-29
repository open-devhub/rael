import type { CommandCallbackOpts } from "../../types/command.ts";
import { resetContext } from "../../utils/context.ts";

export default {
  name: "resetctx",
  description: "Reset conversation context for a user",
  aliases: ["resetcontext", "clearctx", "resetai"],
  async execute({ message, args }: CommandCallbackOpts) {
    if (message.author.bot) return;

    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;

    resetContext(userId);

    if (targetUser.id === message.author.id) {
      await message.reply("Your conversation context has been reset.");
    } else {
      await message.reply(
        `Conversation context for <@${targetUser.id}> has been reset.`,
      );
    }
  },
};
