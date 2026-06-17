# Session-Based Context Redesign

**Status:** Design
**Date:** 2026-06-17
**Scope:** Replace the current in-memory `chatState` Map (15-min TTL, 10-message cap, text-only) with a session model that mirrors how modern chat applications bound context: a 1-hour sliding window of inactivity, a 20,000-token hard cap, multimodal message storage, and tool-based image recall.

## Motivation

Three problems with today's context system:

1. **Images are silently dropped from memory.** `appendUserTurn` only stores `{role, content: string}`. Image parts from the multimodal `content` array are not persisted, so the agent has zero memory of any image after the turn ends.
2. **There is no token budget.** Context grows by message count (capped at 10), not by tokens. A single large image-heavy turn can dominate the model's context window. Recording happens after-the-fact in `data/user-stats.json` for lifetime totals only.
3. **Manual reset paths leak state semantics.** Three separate ways to clear context (`$resetai` command, typed "reset"/"clear" inside `,ai`, and the `resetContext` agent tool) exist to compensate for the lack of a session boundary. With sessions, none of them are needed.

Discord has no native "new chat" concept — every message from a user goes to the same bot. The session itself IS the conversation boundary. The 1-hour sliding window and the 20k cap together do double duty: cost control AND the "this is a new conversation" signal.

## Goals

- One session per user, in memory only, keyed by `userId`.
- Sliding 1-hour inactivity expiry: any message extends the session by 1 hour.
- 20,000-token hard cap per session. When hit, the bot refuses further messages until the session expires.
- Object-style multimodal message storage. Images are first-class.
- Inline only the images from the current user turn; older images become text placeholders the agent can fetch on demand via a `getImage(index)` tool.
- Remove all three manual reset paths.
- No on-disk persistence for session state. Restart = clean slate. (Aligns with everything else in `chat-context.js` today; only `data/user-stats.json` is persisted and that is unaffected.)

## Non-goals

- No auto-segmentation on idle gaps inside a session. Topic drift is accepted: one session = one context.
- No semantic image search, no captioning on upload, no DB.
- No changes to `$stats` / `usage` token tracking. Lifetime/daily totals continue to record from `result.totalUsage.totalTokens`.
- No local tokenizer. Budget enforcement is post-hoc using the model's reported `totalUsage.totalTokens`.

## Session model

Replaces `chatState: Map<userId, { messages, expiresAt }>` with:

```
Session {
  startedAt: number              // epoch ms, set on session creation
  lastActivityAt: number         // updated on every message; the sliding-1h anchor
  tokensUsed: number             // running sum of result.totalUsage.totalTokens across the session
  messages: Message[]            // multimodal history (see Message shape)
  images: ImageRef[]             // session image registry, 1-indexed by `index`
  nextImageIndex: number         // monotonic counter for image ids within the session
}
```

### Lifecycle

- A session is created on the first message from a user when no active session exists for that user.
- `lastActivityAt` is set to `Date.now()` at the start of every message handling.
- A session is **expired** when `Date.now() - lastActivityAt > 60 * 60 * 1000`. Expired sessions are dropped lazily on the next access (no timer needed).
- When a message arrives and the existing session is expired, it is discarded and a fresh session is created. The user is not notified — the new session feels like a clean conversation.

### Token budget

- `tokensUsed` is incremented by `result.totalUsage.totalTokens` after every successful model call (same value already passed to `recordUsage` for lifetime stats).
- **Pre-call check:** before invoking the model, if `tokensUsed >= 20_000`, reply with:
  > "Session limit reached (20,000 tokens). Your session will reset after 1 hour of inactivity (around HH:MM)."
  …where HH:MM is `lastActivityAt + 1 hour` formatted in the user's local time (or UTC if locale is unavailable). Do NOT call the model.
- Because the check is post-hoc, the call that *crosses* 20k is allowed; the next one is blocked. This is acceptable — no local tokenizer dependency is introduced.
- The user cannot manually reset. The only way past the cap is to stop messaging for 1 hour.

## Object-style multimodal messages

The storage shape and the AI SDK send shape converge:

```
Message {
  id: string                     // short unique id (e.g., `m_<counter>`); used only for debugging
  role: "user" | "assistant"
  timestamp: number
  parts: Part[]
}

Part =
  | { type: "text", text: string }
  | { type: "image_ref", index: number, mime: string }
```

- Assistant messages have a single `{type: "text"}` part.
- User messages have a `{type: "text"}` part followed by zero or more `{type: "image_ref"}` parts.
- `image_ref.index` is the 1-indexed id assigned at upload time. The actual bytes live once in `Session.images[]`.

This shape is **canonical**. The transformation to AI SDK format happens at send-time in `buildConversation` (see Send-time rendering).

## Image registry

```
ImageRef {
  index: number                  // 1-indexed, monotonically increasing within the session
  bytes: Buffer                  // downloaded from Discord CDN once at upload
  mime: string                   // "image/png", "image/jpeg", etc.
  uploadedAt: number             // epoch ms; used to render "X min ago" in placeholders
}
```

- On upload: for each image attachment, fetch the bytes from the Discord CDN URL once and store as a Buffer. Increment `nextImageIndex`. Discord CDN URLs are signed and time-limited; downloading guarantees the image is retrievable for the entire session.
- Storage is in-memory. Lost on bot restart, same as the rest of `Session`.
- No size cap on individual images in the registry (Discord already caps attachments by tier). Total registry size is bounded indirectly by the 1-hour session window and the 20k token cap.

## Send-time rendering

`buildConversation` (in `askai.js`) walks `session.messages` and produces the AI SDK `messages` array:

- **Text-only message** → `{ role, content: text }` (unchanged from today's string shape on the AI SDK side).
- **User message with images, current turn (the one being sent right now)** → multimodal content array with `{type: "text", text}` plus one `{type: "image", image: <Buffer or URL>}` per image part. Bytes come from `session.images[index].bytes`.
- **User message with images, prior turn** → single text content collapsing the parts: original text followed by one `[image #N — mime, Xmin ago]` placeholder per image. Example:
  ```
  What does this error mean? [image #3 — image/png, 4 min ago]
  ```

The "current turn" is the user message just appended in this handler invocation. Everything before it is "prior".

This is the **inline-current + placeholder-older** strategy. Rationale:

- Inline images cost hundreds–thousands of tokens each. Keeping every past image inline would exhaust the 20k budget in a few turns.
- A placeholder is ~10–20 tokens.
- The model can recall any past image by calling `getImage(N)` — see Tool: getImage.
- The current turn's images stay inline so the natural "what's in this picture?" / "describe this" flow works without an extra tool round-trip.

## Tool: getImage

Per-request factory, same pattern as the current `createResetContextTool`:

```
createGetImageTool(userId) -> tool({
  description: "Fetch a previously-sent image by its index (e.g., #3) so you can see it again. Use this when the user refers to an earlier image or you need to re-examine one.",
  inputSchema: z.object({
    index: z.number().int().positive().describe("The image number shown in placeholders like [image #N]"),
  }),
  execute: async ({ index }) => {
    // look up session.images for userId
    // return tool result containing the image so AI SDK can feed it into the next step
  }
})
```

- Returns an AI SDK tool result that includes the image (file part with mime + base64 bytes, matching whichever shape the AI SDK v6 expects for tool-result images).
- If the index does not exist in the session, returns `{ found: false, error: "no image #N in this session" }`. The model is expected to apologize and proceed.
- Tool is registered fresh per request (closure over `userId`), replacing `resetContext` in the tool object at `askai.js:215-219`.

## System prompt changes

Current prompt (`BASE_SYSTEM_PROMPT` at `askai.js:64-71`) instructs the model to call `resetContext` on reset requests. Updated prompt:

- Remove the resetContext instruction entirely.
- Add: "Earlier images in this conversation appear as `[image #N — mime, Xmin ago]` placeholders. If you need to actually see one of those images again (e.g., the user asks about it, or you need to re-examine a detail), call `getImage` with that index. The current turn's images are already attached and do not need a tool call."

## What gets removed

| File / location | Action |
|---|---|
| `src/commands/ai/resetai.js` | Delete file |
| `src/tools/reset-context.js` | Delete file |
| `src/commands/ai/askai.js:137-150` (reset/clear typed-phrase branch) | Delete block |
| `src/commands/ai/askai.js` `resetContext` import and tool registration | Delete |
| `src/utils/chat-context.js` `clearUserContext` export | Delete (the new module simply does not export it) |
| `BASE_SYSTEM_PROMPT` resetContext instruction | Delete that sentence |

The `,ai` command's `getReplyContext` helper (Discord reply-to-bot one-shot context) is unchanged. It injects a single ephemeral assistant message for the current turn only and does not touch `Session.messages`.

## Module API

### `src/utils/chat-context.js` (rewritten)

Exports:

- `getOrCreateSession(userId): Session` — returns the live session for the user, creating one if none exists or the existing one expired. Always updates `lastActivityAt` to now.
- `getActiveSession(userId): Session | null` — non-mutating peek; returns null if no active session.
- `appendUserTurn(userId, { text, images }): { messageId, imageRefs }` — appends a user message. `images` is an array of `{ bytes, mime }`. Adds each image to `session.images` with a new index, returns the assigned refs so the caller can build the inline multimodal payload.
- `appendAssistantTurn(userId, text)` — appends an assistant text message.
- `recordTokens(userId, tokens)` — adds to `session.tokensUsed`.
- `isOverBudget(userId): boolean` — true when `tokensUsed >= 20_000`.
- `sessionResetsAt(userId): number | null` — epoch ms when the session will expire (`lastActivityAt + 1h`), or null if no session.
- `getImageBytes(userId, index): { bytes, mime } | null` — used by the `getImage` tool.

No more `clearUserContext`. No more module-level constants for message count caps.

### `src/tools/get-image.js` (new)

Single export: `createGetImageTool(userId)`. Same factory shape as `createResetContextTool`.

### `src/commands/ai/askai.js` (rewired)

Key behavioral changes inside the message handler:

1. Before the reset-phrase branch existed → that branch is gone.
2. Early in the handler: `getOrCreateSession(userId)`. This is also where the sliding clock is updated.
3. If `isOverBudget(userId)`: reply with the limit message including `sessionResetsAt`, return. No model call.
4. Download image attachments (existing `getImageAttachments` becomes a Buffer-returning variant). Call `appendUserTurn(userId, { text, images })` to register them and append the user message.
5. `buildConversation` walks `session.messages` plus the current-turn payload, applying the inline-current + placeholder-older rule.
6. `generateText({ ... tools: { search, stock, getImage: createGetImageTool(userId) }, ... })`.
7. On success: `recordTokens(userId, result.totalUsage.totalTokens)`, `appendAssistantTurn(userId, answer)`, plus the existing `recordUsage(...)` call for lifetime stats.

## Architecture diagram

```
                                   Discord message
                                          |
                                          v
                                  askai handler
                                          |
                            getOrCreateSession(userId)
                                          |
                       +------------------+------------------+
                       |                                     |
              isOverBudget? --yes--> reply "limit reached, resets at HH:MM"
                       |
                       no
                       |
              download image bytes (if any)
                       |
              appendUserTurn(text, images)  --> session.messages, session.images
                       |
              buildConversation
                  (inline current turn's images,
                   placeholders for older images)
                       |
              generateText({ messages, tools: { search, stock, getImage } })
                       |
                   model needs an old image?
                       |
                       +-- getImage(N) --> session.images[N].bytes --> back into model
                       |
                  response text
                       |
              recordTokens(totalTokens)
              appendAssistantTurn(text)
              recordUsage(...) (existing lifetime stats)
                       |
                  reply to user
```

## Testing strategy

Manual smoke tests via the live bot (no automated test infra exists in this repo today):

1. **Fresh session, text only:** mention bot, get a reply, mention again — second reply has the first turn in context.
2. **Inactivity expiry:** mention, wait >1 hour, mention — second reply has no memory of the first.
3. **Sliding extension:** mention every 30 minutes for 2 hours — context preserved throughout.
4. **20k cap:** force a long session (or temporarily lower the cap in code) until the limit message appears; verify next message in same session also gets the limit message; verify the message is unblocked after the sliding window expires.
5. **Image inline (current turn):** upload an image with a question; verify the vision model answers correctly.
6. **Image placeholder + getImage recall:** upload image A, then send several text turns, then ask "what was in the first image I sent?" — model should call `getImage(1)` and answer.
7. **getImage on missing index:** ask "describe image #99" — model handles the not-found gracefully.
8. **Reset paths gone:** `$resetai` should be unrecognized; typing "reset" inside `,ai` should be treated as a normal question.

## Open questions

None. All design decisions are settled:

- Hard stop at 20k, no manual override → user waits out the hour.
- Sliding 1-hour inactivity expiry.
- Image storage in-memory Buffer; no disk persistence; session-bounded lifetime.
- Inline-current + placeholder-older for image context.
- Topic drift accepted; no auto-segmentation.
- `$stats` / `usage` unchanged.
