import { AttachmentBuilder } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { getUserStats } from "../../utils/stats.ts";
import { renderStatsCard } from "../../visuals/statsCard.ts";

export default {
  name: "stats",
  description: "Show your AI usage statistics with heatmap",
  aliases: ["mystats", "usage-stats"],
  async execute({ message }: CommandCallbackOpts) {
    if (message.author.bot) return;

    try {
      const target = message.mentions?.users?.first() || message.author;
      const userId = target.id;

      const stats = await getUserStats(userId);

      if (!stats.hasData) {
        const who =
          target.id === message.author.id
            ? "You have"
            : `${target.username} has`;

        await message.reply(
          `${who} no AI usage recorded yet. Use \`$ai\` or \`,\` with a question to start tracking your stats.`,
        );
        return;
      }

      const member = message.guild
        ? await message.guild.members.fetch(target.id).catch(() => null)
        : null;

      const displayName =
        member?.displayName || stats.displayName || target.username;
      const avatarUrl =
        target.displayAvatarURL({ extension: "png", size: 256 }) ||
        stats.avatar ||
        null;

      const buffer = await renderStatsCard({
        displayName,
        handle: `@${target.username}`,
        avatarUrl,
        brand: "Rael",
        heatmap: stats.heatmap,
        lifetimeTokens: stats.lifetimeTokens,
        peakDayTokens: stats.peakDayTokens,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: `stats-${target.id}.png`,
      });

      await message.reply({ files: [attachment] });
    } catch (err) {
      console.error("Stats command error:", err);
      await message.reply("Could not generate your stats card right now.");
    }
  },
};
