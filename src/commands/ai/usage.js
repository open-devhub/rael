import { AttachmentBuilder } from "discord.js";
import { getSessionSnapshot } from "../../utils/chat-context.js";
import { renderSessionCard } from "../../utils/session-card.js";

export default {
  name: "usage",
  description: "Show your current AI session limits and remaining context",
  aliases: ["context", "session"],
  callback: async (client, message) => {
    try {
      if (message.author.bot) return;

      const snapshot = getSessionSnapshot(message.author.id);

      const member = message.guild
        ? await message.guild.members.fetch(message.author.id).catch(() => null)
        : null;
      const displayName =
        member?.displayName || message.author.username || "Unknown";
      const avatarUrl =
        message.author.displayAvatarURL?.({ extension: "png", size: 256 }) ||
        null;

      const buffer = await renderSessionCard({
        displayName,
        handle: `@${message.author.username}`,
        avatarUrl,
        brand: "Rael",
        active: snapshot.active,
        tokensUsed: snapshot.tokensUsed,
        tokenBudget: snapshot.tokenBudget,
        timeRemainingMs: snapshot.active
          ? Math.max(0, snapshot.expiresAt - Date.now())
          : null,
        messageCount: snapshot.messageCount ?? 0,
        imageCount: snapshot.imageCount ?? 0,
        overBudget: !!snapshot.overBudget,
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: `session-${message.author.id}.png`,
      });

      await message.reply({ files: [attachment] });
    } catch (err) {
      console.error("Usage command error:", err);
      await message.reply("Could not generate your session card right now.");
    }
  },
};
