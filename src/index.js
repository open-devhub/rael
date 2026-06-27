import { Client, IntentsBitField } from "discord.js";
import "dotenv/config";
import askai from "./commands/ai/askai.js";
import eventHandler from "./handlers/eventHandler.js";

export const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

eventHandler(client);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!client.user) return;

  if (!message.mentions.has(client.user)) return;

  const content = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, "g"), "")
    .trim();

  if (!content) {
    return message.reply(
      "You just mentioned me, but didn't say anything else! What's up?",
    );
  }

  try {
    await askai.callback(client, message, [content]);
  } catch (err) {
    console.error(err);
    await message.reply("Something broke. Try again.");
  }
});

client.login(process.env.TOKEN).catch(console.error);
