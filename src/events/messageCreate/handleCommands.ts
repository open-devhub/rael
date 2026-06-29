import type { Client, Message } from "discord.js";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import data from "../../../config.json" with { type: "json" };
import getAllFiles from "../../utils/getAllFiles.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { prefixes, devs } = data;

const COOLDOWN_SECONDS = 3;
const USER_COOLDOWNS = new Map();

export default async (client: Client, message: Message) => {
  if (!message || !message.guild || message.author?.bot) return;

  if (
    process.env.NODE_ENV?.toLowerCase() === "dev" &&
    !devs.includes(message.author.id)
  )
    return;

  const now = Date.now();
  const expiry = USER_COOLDOWNS.get(message.author.id);
  if (expiry && expiry > now) {
    return;
  }

  try {
    const prefix = prefixes.find((p) => message.content.startsWith(p));
    if (!prefix) return;

    const expireAt = Date.now() + COOLDOWN_SECONDS * 1000;
    USER_COOLDOWNS.set(message.author.id, expireAt);
    setTimeout(
      () => USER_COOLDOWNS.delete(message.author.id),
      COOLDOWN_SECONDS * 1000,
    );

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args?.shift()?.toLowerCase();
    const commandsPath = path.join(__dirname, "..", "..", "commands");

    const commandsCategories = getAllFiles(commandsPath, true);
    const commands = [];

    for (const category of commandsCategories) {
      const commandFiles = getAllFiles(category);
      for (const file of commandFiles) {
        const mod = await import(file);
        const command = (mod && mod.default) || mod;
        commands.push(command);
      }
    }

    const commandObject = commands.find((cmd) => {
      if (!cmd || !cmd.name) return false;
      if (String(cmd.name).toLowerCase() === commandName) return true;
      if (Array.isArray(cmd.aliases)) {
        return cmd.aliases
          .map((a: string) => String(a).toLowerCase())
          .includes(commandName);
      }
      return false;
    });
    if (!commandObject) return;

    if (commandObject.permissionsRequired?.length) {
      for (const permission of commandObject.permissionsRequired) {
        if (!message?.member?.permissions?.has(permission)) {
          message.reply("Not enough permissions to run this command.");
          return;
        }
      }
    }
    if (typeof commandObject.execute === "function") {
      await commandObject.execute({ client, message, args, prefix });
    }
  } catch (err) {
    console.error("Prefix Command Error:", err);
  }
};
