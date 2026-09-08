import type { Client, Message } from "discord.js";
import data from "../../../config.json" with { type: "json" };
import askai from "../../commands/ai/askai.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";

const { aiModePrefix, devs } = data;

export default async (client: Client, message: Message) => {
  if (!message || !message.guild || message.author.bot) return;
  if (
    process.env.NODE_ENV?.toLowerCase() === "dev" &&
    !devs.includes(message.author.id)
  )
    return;

  if (!message.content.startsWith(aiModePrefix)) return;

  const content = message.content.slice(aiModePrefix.length).trim();

  const args = content.split(/ +/);

  if (!content) {
    return message.reply("What's up?");
  }

  try {
    await askai.execute({ message, args } as CommandCallbackOpts);
  } catch (err) {
    console.error(err);
    await message.reply("Something broke. Try again.");
  }
};
