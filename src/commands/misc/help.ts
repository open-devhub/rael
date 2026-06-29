import { EmbedBuilder } from "discord.js";
import path, { join } from "path";
import { fileURLToPath } from "url";
import type { CommandCallbackOpts } from "../../types/command.ts";
import getAllFiles from "../../utils/getAllFiles.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  name: "help",
  description:
    "Provides information about available commands and how to use them.",
  /**
   *
   * @param {Client} client
   * @param {Message} message
   */
  execute: async ({ message }: CommandCallbackOpts) => {
    const prefixCommandsPath = join(__dirname, "..", "..", "commands");

    const prefixCommandsCategories = getAllFiles(prefixCommandsPath, true);

    const categoriesData = await Promise.all(
      prefixCommandsCategories.map(async (category) => {
        const categoryName = path.basename(category);
        const commandFiles = getAllFiles(category);
        const commands = await Promise.all(
          commandFiles.map(async (file) => {
            let rel = path.relative(__dirname, file).replace(/\\/g, "/");
            if (!rel.startsWith(".")) rel = "./" + rel;
            const cmd = await import(rel);
            return cmd;
          }),
        );
        const commandsInCategory = commands.map(
          (cmd) => `\`${cmd.default.name}\`: ${cmd.default.description}`,
        );
        return `**${categoryName}**\n${commandsInCategory.join("\n")}`;
      }),
    );
    // const quickAiHelp = [
    //   "Quick AI:",
    //   "`$ai <question>` Ask AI",
    //   "`$ai reset` Clear your AI context",
    //   "`$resetai` Alias for AI context reset",
    //   "`$persona list` List available personas",
    //   "`$persona set <name>` Switch persona",
    //   "",
    // ].join("\n");

    const helpText = `### Usage:\n\n\`$[cmd]\`\n### Available Commands:\n\n${categoriesData.join("\n\n")}`;

    const embed = new EmbedBuilder()
      .setTitle("📘 Commands Guide")
      .setDescription(helpText.trim() || "No commands available.")
      .setColor(0x5865f2)
      .setFooter({
        text: `Requested by ${message.author.tag} • Rael`,
        iconURL: message.author.displayAvatarURL(),
      });
    return message.reply({ embeds: [embed] });
  },
};
