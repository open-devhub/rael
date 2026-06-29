import type { Client, Message } from "discord.js";
import data from "../../../config.json" with { type: "json" };
import askai from "../../commands/ai/askai.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";

const { aiModePrefix } = data;

export default async (client: Client, message: Message) => {
  if (message.author.bot) return;
  if (!client.user) return;

  if (!message.content.startsWith(aiModePrefix)) return;

  const content = message.content.slice(aiModePrefix.length).trim();

  const args = content?.split(/ +/);

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
