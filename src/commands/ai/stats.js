import { AttachmentBuilder } from "discord.js";
import { renderStatsCard } from "../../utils/stats-card.js";
import { getUserStats } from "../../utils/user-stats.js";

export default {
  name: "stats",
  description: "Show your personal AI usage stats card",
  aliases: ["mystats", "usage"],
  callback: async (client, message, args) => {
    try {
      if (message.author.bot) return;

      // Allow viewing another member's stats via mention: `$stats @user`.
      const target = message.mentions?.users?.first() || message.author;

      const stats = await getUserStats(target.id);

      if (!stats.hasData) {
        const who =
          target.id === message.author.id
            ? "You have"
            : `${target.username} has`;
        await message.reply(
          `${who} no AI usage recorded yet. Ask me something with \`,\` or \`$ai\` and your stats will start tracking.`,
        );
        return;
      }

      const member = message.guild
        ? await message.guild.members.fetch(target.id).catch(() => null)
        : null;
      const displayName =
        member?.displayName || stats.displayName || target.username;
      const avatarUrl =
        target.displayAvatarURL?.({ extension: "png", size: 256 }) ||
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
