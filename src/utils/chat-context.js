const CONTEXT_TTL_MS = 15 * 60 * 1000;
const MAX_CONTEXT_MESSAGES = 10;

const chatState = new Map();

export function getUserContext(userId) {
  const entry = chatState.get(userId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    chatState.delete(userId);
    return null;
  }
  return entry.messages;
}

export function appendUserTurn(userId, question, answer) {
  const current = chatState.get(userId)?.messages || [];
  const next = [
    ...current,
    { role: "user", content: question },
    { role: "assistant", content: answer },
  ].slice(-MAX_CONTEXT_MESSAGES);

  chatState.set(userId, {
    messages: next,
    expiresAt: Date.now() + CONTEXT_TTL_MS,
  });
}

export function clearUserContext(userId) {
  return chatState.delete(userId);
}
