import { Client, IntentsBitField } from "discord.js";
import "dotenv/config";
import eventHandler from "./handlers/eventHandler.js";
import askai from "./commands/ai/askai.js";

const client = new Client({
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
    return message.reply("You mentioned me, but didn't say anything else!");
  }

  try {
    await askai.callback(client, message, [content]);
  } catch (err) {
    console.error(err);
    await message.reply("Something broke. Try again.");
  }
});

client.login(process.env.TOKEN).catch(console.error);
