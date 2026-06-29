export function sanitizeForPrompt(text: string, maxLength = 2000): string {
  if (!text) return "";

  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/`/g, "\\`")
    .replace(/\n/g, " ")
    .slice(0, maxLength);
}
