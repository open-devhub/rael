import { AttachmentBuilder } from "discord.js";
import { BASE_SYSTEM_PROMPT, SERVER_INFO } from "../prompt-messages/prompts.js";
import { fetchStock } from "../tools/get-stock.js";
import { renderStockCard } from "./stock-card.js";

export function buildSystemPrompt(persona, personaPrompt) {
  const sections = [BASE_SYSTEM_PROMPT, SERVER_INFO];

  if (persona?.name)
    sections.push(`Active persona: ${persona.name} (${persona.id})`);
  if (personaPrompt)
    sections.push(`Persona behavior profile:\n${personaPrompt}`);

  return sections.join("\n\n");
}

export async function sendStockCards(message, result) {
  const aggregateToolResults = [
    ...(Array.isArray(result?.toolResults) ? result.toolResults : []),
    ...(Array.isArray(result?.steps)
      ? result.steps.flatMap((step) => step?.toolResults || [])
      : []),
  ];

  const seen = new Set();
  const symbols = aggregateToolResults
    .filter(
      (item) =>
        item?.type === "tool-result" &&
        item?.toolName === "stock" &&
        item?.output?.success &&
        item?.output?.symbol,
    )
    .map((item) => String(item.output.symbol))
    .filter((symbol) => {
      if (seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    })
    .slice(0, 3);

  for (const symbol of symbols) {
    try {
      const data = await fetchStock(symbol);
      const buffer = renderStockCard({
        symbol: data.symbol,
        name: data.name,
        exchange: data.exchange,
        currency: data.currency,
        price: data.price,
        change: data.change,
        percentChange: data.percentChange,
        series: data.series,
        brand: "Pawgrammer",
      });
      const attachment = new AttachmentBuilder(buffer, {
        name: `stock-${data.symbol}.png`,
      });
      await message.channel.send({ files: [attachment] });
    } catch (err) {
      console.error(`Failed to render stock card for ${symbol}:`, err);
    }
  }
}
