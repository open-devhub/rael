import path, { join } from "path";
import { fileURLToPath } from "url";
import getAllFiles from "../../utils/getAllFiles.js";
import getConfig from "../../utils/getConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COOLDOWN_SECONDS = 3;
const USER_COOLDOWNS = new Map();

export default async (client, message) => {
  if (!message || !message.guild || message.author?.bot) return;

  const now = Date.now();
  const expiry = USER_COOLDOWNS.get(message.author.id);
  if (expiry && expiry > now) {
    return;
  }

  try {
    const config = await getConfig();
    const prefixes = config.prefixes || [","];
    const prefix = prefixes.find((p) => message.content.startsWith(p));
    if (!prefix) return;

    const expireAt = Date.now() + COOLDOWN_SECONDS * 1000;
    USER_COOLDOWNS.set(message.author.id, expireAt);
    setTimeout(
      () => USER_COOLDOWNS.delete(message.author.id),
      COOLDOWN_SECONDS * 1000,
    );

    let rawInput = message.content.slice(prefix.length).trim();
    let commandName;
    let args;

    if (prefix === ",") {
      // Comma prefix is chat-first: route straight to AI.
      if (rawInput.toLowerCase() === "ai") {
        rawInput = "";
      } else if (rawInput.toLowerCase().startsWith("ai ")) {
        rawInput = rawInput.slice(3).trim();
      }

      commandName = "ai";
      args = rawInput ? rawInput.split(/ +/) : [];
    } else {
      args = rawInput ? rawInput.split(/ +/) : [];
      commandName = String(args.shift() || "").toLowerCase();
    }

    if (!commandName) return;
    const prefixCommandsPath = join(__dirname, "..", "..", "commands");

    const prefixCommandsCategories = getAllFiles(prefixCommandsPath, true);
    const commandPromises = [];

    for (const category of prefixCommandsCategories) {
      const commandFiles = getAllFiles(category);
      for (const file of commandFiles) {
        commandPromises.push(import(file));
      }
    }

    const prefixCommands = await Promise.all(commandPromises);

    const commandObject = prefixCommands.find((cmd) => {
      const command = cmd.default;
      if (!command || !command.name) return false;
      if (String(command.name).toLowerCase() === commandName) return true;
      if (Array.isArray(command.aliases)) {
        return command.aliases
          .map((a) => String(a).toLowerCase())
          .includes(commandName);
      }
      return false;
    })?.default;
    if (!commandObject) return;

    if (commandObject.permissionsRequired?.length) {
      for (const permission of commandObject.permissionsRequired) {
        if (!message.member.permissions.has(permission)) {
          message.reply("Not enough permissions to run this command.");
          return;
        }
      }
    }

    commandObject.callback(client, message, args);

    // const defaultReaction = "🐾";
    // let emoji;
    // if (typeof commandObject.react === "string") {
    //   emoji = commandObject.react;
    // } else if (commandObject.react !== false) {
    //   emoji = defaultReaction;
    // }

    // if (emoji) {
    //   try {
    //     await message.react(emoji);
    //   } catch (err) {
    //     console.error("Failed to react to message:", err);
    //   }
    // }
  } catch (err) {
    console.error("Prefix Command Error:", err);
  }
};
