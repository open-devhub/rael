// Smoke test: exercise the session store + session card without Discord.
// Run: node scripts/smoke-session.mjs
import {
  getOrCreateSession,
  appendUserTurn,
  appendAssistantTurn,
  recordTokens,
  isOverBudget,
  sessionResetsAt,
  getImageBytes,
  getSessionSnapshot,
  SESSION_TOKEN_BUDGET,
} from "../src/utils/chat-context.js";
import { renderSessionCard } from "../src/utils/session-card.js";
import { writeFileSync, mkdirSync } from "node:fs";

let pass = 0;
let fail = 0;
const assert = (cond, label) => {
  if (cond) {
    pass++;
    console.log(`  ok  - ${label}`);
  } else {
    fail++;
    console.error(`FAIL  - ${label}`);
  }
};

const UID = "smoke-user-1";

// 1. Fresh session.
const s0 = getOrCreateSession(UID);
assert(s0.tokensUsed === 0, "fresh session starts at 0 tokens");
assert(s0.messages.length === 0, "fresh session has no messages");

// 2. Append a text-only user turn + assistant turn.
appendUserTurn(UID, { text: "hello" });
appendAssistantTurn(UID, "hi there");
const s1 = getOrCreateSession(UID);
assert(s1.messages.length === 2, "text turns appended");

// 3. Append a user turn with a fake image; verify registry.
const fakePng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);
const { imageRefs } = appendUserTurn(UID, {
  text: "what is this?",
  images: [{ bytes: fakePng, mime: "image/png" }],
});
assert(
  imageRefs.length === 1 && imageRefs[0].index === 1,
  "image assigned index 1",
);

const img = getImageBytes(UID, 1);
assert(!!img && img.mime === "image/png", "getImageBytes returns stored image");
assert(getImageBytes(UID, 99) === null, "missing image index returns null");

// 4. Token accounting.
recordTokens(UID, 5000);
assert(getOrCreateSession(UID).tokensUsed === 5000, "tokens recorded");
assert(isOverBudget(UID) === false, "under budget at 5000");

// 5. Hit the cap.
recordTokens(UID, SESSION_TOKEN_BUDGET);
assert(isOverBudget(UID) === true, "over budget after adding cap");
assert(sessionResetsAt(UID) !== null, "sessionResetsAt returns a time");

// 6. Snapshot shape for the card.
const snap = getSessionSnapshot(UID);
assert(snap.active === true, "snapshot.active true");
assert(snap.overBudget === true, "snapshot.overBudget true");
assert(snap.imageCount === 1, "snapshot.imageCount === 1");
assert(snap.messageCount === 3, "snapshot.messageCount === 3");

// 7. Render the card both active+over-budget and idle.
mkdirSync("scripts/out", { recursive: true });
const bufActive = await renderSessionCard({
  displayName: "Smoke Tester",
  handle: "@smoke",
  brand: "Rael",
  active: true,
  tokensUsed: snap.tokensUsed,
  tokenBudget: snap.tokenBudget,
  timeRemainingMs: Math.max(0, snap.expiresAt - Date.now()),
  idleMs: snap.idleMs,
  messageCount: snap.messageCount,
  imageCount: snap.imageCount,
  overBudget: snap.overBudget,
});
writeFileSync("scripts/out/session-active.png", bufActive);
assert(
  bufActive.length > 1000 && bufActive[0] === 0x89,
  "active card renders to PNG",
);

const bufIdle = await renderSessionCard({
  displayName: "Smoke Tester",
  handle: "@smoke",
  brand: "Rael",
  active: false,
  tokensUsed: 0,
  tokenBudget: SESSION_TOKEN_BUDGET,
  timeRemainingMs: null,
  idleMs: 60 * 60 * 1000,
  messageCount: 0,
  imageCount: 0,
  overBudget: false,
});
writeFileSync("scripts/out/session-idle.png", bufIdle);
assert(
  bufIdle.length > 1000 && bufIdle[0] === 0x89,
  "idle card renders to PNG",
);

// 8. Mid-fill card for visual range.
const bufMid = await renderSessionCard({
  displayName: "Smoke Tester",
  handle: "@smoke",
  brand: "Rael",
  active: true,
  tokensUsed: 9000,
  tokenBudget: SESSION_TOKEN_BUDGET,
  timeRemainingMs: 42 * 60 * 1000,
  idleMs: 60 * 60 * 1000,
  messageCount: 7,
  imageCount: 2,
  overBudget: false,
});
writeFileSync("scripts/out/session-mid.png", bufMid);
assert(bufMid.length > 1000, "mid-fill card renders to PNG");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
