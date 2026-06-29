import type { Client, Message } from "discord.js";
import askai from "../../commands/ai/askai.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";

export default async (client: Client, message: Message) => {
  if (message.author.bot) return;
  if (!client.user) return;

  if (!message.mentions.has(client.user)) return;

  const content = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, "g"), "")
    .trim();

  const args = content.split(/ +/).filter(Boolean);

  if (!content) {
    return message.reply("What's up?");
  }

  let ctx: string | undefined;

  if (message.reference?.messageId) {
    try {
      const repliedMessage = await message.channel.messages.fetch(
        message.reference.messageId,
      );
      if (repliedMessage) {
        ctx = repliedMessage.content;
      }
    } catch (err) {
      console.warn("Could not fetch replied message:", err);
    }
  }

  try {
    await askai.execute({
      message,
      args,
      ctx,
    } as CommandCallbackOpts);
  } catch (err) {
    console.error(err);
    await message.reply("Something broke. Try again.");
  }
};
