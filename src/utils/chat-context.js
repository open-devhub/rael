// Session-based context store.
//
// One session per user, in-memory only. A session lasts for a fixed duration
// from creation or until its token budget is exhausted. Hitting the cap rejects
// further messages until the session duration elapses; there is no manual reset
// path.

export const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;
export const SESSION_TOKEN_BUDGET = 200_000;

const sessions = new Map();

function isExpired(session, now = Date.now()) {
  return now - session.startedAt > SESSION_DURATION_MS;
}

function createSession(now) {
  return {
    startedAt: now,
    lastActivityAt: now,
    tokensUsed: 0,
    messages: [],
    images: [],
    nextImageIndex: 1,
    nextMessageId: 1,
  };
}

// Returns the live session, creating a fresh one if none exists or the
// existing one has expired.
export function getOrCreateSession(userId) {
  const now = Date.now();
  const existing = sessions.get(userId);
  if (existing && !isExpired(existing, now)) {
    existing.lastActivityAt = now;
    return existing;
  }
  const fresh = createSession(now);
  sessions.set(userId, fresh);
  return fresh;
}

// Non-mutating peek. Returns null if no active session.
export function getActiveSession(userId) {
  const session = sessions.get(userId);
  if (!session) return null;
  if (isExpired(session)) {
    sessions.delete(userId);
    return null;
  }
  return session;
}

// Append a user turn. `images` is an array of { bytes: Buffer, mime: string }.
// Each image is registered in the session's image registry and the message
// parts reference them by index.
export function appendUserTurn(userId, { text, images = [] }) {
  const session = getOrCreateSession(userId);
  session.lastActivityAt = Date.now();
  const parts = [];
  if (text) parts.push({ type: "text", text });

  const refs = [];
  for (const image of images) {
    const index = session.nextImageIndex++;
    session.images.push({
      index,
      bytes: image.bytes,
      mime: image.mime,
      uploadedAt: Date.now(),
    });
    parts.push({ type: "image_ref", index, mime: image.mime });
    refs.push({ index, mime: image.mime });
  }

  const messageId = `m_${session.nextMessageId++}`;
  session.messages.push({
    id: messageId,
    role: "user",
    timestamp: Date.now(),
    parts,
  });
  return { messageId, imageRefs: refs };
}

export function appendAssistantTurn(userId, text) {
  const session = getOrCreateSession(userId);
  session.lastActivityAt = Date.now();
  const messageId = `m_${session.nextMessageId++}`;
  session.messages.push({
    id: messageId,
    role: "assistant",
    timestamp: Date.now(),
    parts: [{ type: "text", text: text || "" }],
  });
  return messageId;
}

export function recordTokens(userId, tokens) {
  const session = getActiveSession(userId);
  if (!session) return;
  session.tokensUsed += Math.max(0, Number(tokens) || 0);
}

export function isOverBudget(userId) {
  const session = getActiveSession(userId);
  if (!session) return false;
  return session.tokensUsed >= SESSION_TOKEN_BUDGET;
}

// Milliseconds remaining until the current session expires. Null if no active
// session.
export function sessionResetsAt(userId) {
  const session = getActiveSession(userId);
  if (!session) return null;
  return session.startedAt + SESSION_DURATION_MS;
}

export function sessionTimeRemaining(userId) {
  const session = getActiveSession(userId);
  if (!session) return null;
  return Math.max(0, session.startedAt + SESSION_DURATION_MS - Date.now());
}

export function getImageBytes(userId, index) {
  const session = getActiveSession(userId);
  if (!session) return null;
  const entry = session.images.find((img) => img.index === index);
  if (!entry) return null;
  return { bytes: entry.bytes, mime: entry.mime };
}

// Lightweight read-only snapshot for the $usage command. Avoids leaking
// Buffer payloads or letting callers mutate internal state.
export function getSessionSnapshot(userId) {
  const session = getActiveSession(userId);
  if (!session) {
    return {
      active: false,
      tokensUsed: 0,
      tokenBudget: SESSION_TOKEN_BUDGET,
      durationMs: SESSION_DURATION_MS,
    };
  }
  return {
    active: true,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    expiresAt: session.startedAt + SESSION_DURATION_MS,
    tokensUsed: session.tokensUsed,
    tokenBudget: SESSION_TOKEN_BUDGET,
    durationMs: SESSION_DURATION_MS,
    messageCount: session.messages.length,
    imageCount: session.images.length,
    overBudget: session.tokensUsed >= SESSION_TOKEN_BUDGET,
  };
}
