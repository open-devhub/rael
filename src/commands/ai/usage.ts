import { AttachmentBuilder } from "discord.js";
import { HOURLY_TOKEN_LIMIT } from "../../constants/usage.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { canUseAI } from "../../utils/usage.ts";
import { renderUsageCard } from "../../visuals/usageCard.ts";

export default {
  name: "usage",
  description: "Show your current token usage",
  aliases: ["tokens", "limit", "session"],
  async execute({ message }: CommandCallbackOpts) {
    if (message.author.bot) return;

    const userId = message.author.id;
    const displayName = message.author.displayName || message.author.username;
    const handle = `@${message.author.username}`;
    const avatarUrl = message.author.displayAvatarURL({
      extension: "png",
      size: 256,
    });

    const { tokensUsed, msUntilReset } = await canUseAI(userId);
    const overBudget = tokensUsed >= HOURLY_TOKEN_LIMIT;

    const cardOptions = {
      displayName,
      handle,
      avatarUrl,
      brand: "Token Usage",
      active: true,
      tokensUsed,
      tokenBudget: HOURLY_TOKEN_LIMIT,
      timeRemainingMs: msUntilReset,
      messageCount: 0,
      imageCount: 0,
      overBudget,
    };

    try {
      const buffer = await renderUsageCard(cardOptions);
      const attachment = new AttachmentBuilder(buffer, { name: "usage.png" });
      await message.reply({ files: [attachment] });
    } catch (err) {
      console.error(err);
      await message.reply("Couldn't generate usage card.");
    }
  },
};
