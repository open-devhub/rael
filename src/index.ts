import { Client, IntentsBitField } from "discord.js";
import "dotenv/config";
import eventHandler from "./handlers/eventHandler.ts";

export const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildPresences,
    IntentsBitField.Flags.MessageContent,
  ],
  allowedMentions: {
    parse: [],
    repliedUser: false,
    roles: [],
    users: [],
  },
});

(async () => {
  try {
    eventHandler(client);

    client.login(process.env.TOKEN).catch((err) => {
      console.error("Discord login error:", err);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
