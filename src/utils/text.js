export function splitToChunks(text, maxLen) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cutAt = maxLen;
    while (cutAt > 0 && remaining[cutAt - 1] !== " ") {
      cutAt--;
    }
    if (cutAt === 0) cutAt = maxLen;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function applyOutputGuardrails(answer) {
  let output = String(answer || "").trim();
  if (!output) return "I could not generate a response.";
  return output;
}

import {
  BLOCKED_INTENT_PATTERNS,
  JAILBREAK_PATTERNS,
} from "../prompt-messages/prompts.js";

export function isSafeInput(question) {
  if (BLOCKED_INTENT_PATTERNS.some((pattern) => pattern.test(question))) {
    return false;
  }

  if (JAILBREAK_PATTERNS.some((pattern) => pattern.test(question))) {
    return false;
  }

  return true;
}

export function wasToolUsed(result, toolName) {
  const aggregateToolResults = [
    ...(Array.isArray(result?.toolResults) ? result.toolResults : []),
    ...(Array.isArray(result?.steps)
      ? result.steps.flatMap((step) => step?.toolResults || [])
      : []),
  ];

  return aggregateToolResults.some(
    (item) => item?.type === "tool-result" && item?.toolName === toolName,
  );
}

export function buildToolFallbackText(result) {
  const aggregateToolResults = [
    ...(Array.isArray(result?.toolResults) ? result.toolResults : []),
    ...(Array.isArray(result?.steps)
      ? result.steps.flatMap((step) => step?.toolResults || [])
      : []),
  ];

  const seen = new Set();
  const searchResults = aggregateToolResults
    .filter(
      (item) => item?.type === "tool-result" && item?.toolName === "search",
    )
    .flatMap((item) =>
      Array.isArray(item?.output?.results) ? item.output.results : [],
    )
    .filter((item) => {
      if (!item?.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, 5);

  if (!searchResults.length) return "I could not generate a response.";

  const lines = ["I found relevant sources:"];
  for (const [index, item] of searchResults.entries()) {
    const title = item.title || "Untitled source";
    const url = item.url || "";
    const snippet = Array.isArray(item.highlights)
      ? String(item.highlights[0] || "")
      : "";

    let section = `${index + 1}. ${title}\n${url}`;
    if (snippet) section += `\n${snippet}`;
    lines.push(section);
  }

  return lines.join("\n\n");
}

export function getBestAnswer(result) {
  const modelText = (result?.text || "").trim();
  if (modelText) return modelText;

  const toolFallback = buildToolFallbackText(result);
  if (toolFallback) return toolFallback;

  return "I could not generate a response.";
}
