import { MAX_CONTENT_LENGTH, MAX_MESSAGES } from "../constants/context.ts";
import type { ChatMessage } from "../types/context.ts";

const CONTEXTS = new Map<string, ChatMessage[]>();

setInterval(
  () => {
    CONTEXTS.clear();
    console.log("[Context] Cleared all conversation contexts (30 min reset)");
  },
  30 * 60 * 1000,
);

export function getContext(userId: string): ChatMessage[] {
  return CONTEXTS.get(userId) || [];
}

export function addToContext(
  userId: string,
  role: "user" | "assistant",
  content: string,
) {
  if (!CONTEXTS.has(userId)) {
    CONTEXTS.set(userId, []);
  }

  const history = CONTEXTS.get(userId)!;

  const truncated =
    content.length > MAX_CONTENT_LENGTH
      ? content.slice(0, MAX_CONTENT_LENGTH) + "..."
      : content;

  history.push({ role, content: truncated });

  if (history.length > MAX_MESSAGES) {
    history.shift();
  }

  CONTEXTS.set(userId, history);
}

export function resetContext(userId: string) {
  CONTEXTS.delete(userId);
}
