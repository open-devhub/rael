import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const STATS_FILE = path.join(DATA_DIR, "user-stats.json");

// In-memory cache backed by a JSON file so lifetime totals and streaks
// survive bot restarts. No DB is connected, so we mirror the existing
// file-read pattern used by getConfig.js.
let store = null; // { users: { [userId]: UserRecord } }
let loadPromise = null;
let writeQueued = false;
let writing = false;

/**
 * UserRecord shape:
 * {
 *   username: string,
 *   displayName: string,
 *   avatar: string,            // avatar URL
 *   lifetimeTokens: number,
 *   peakDayTokens: number,
 *   daily: { "YYYY-MM-DD": number }
 * }
 */

async function load() {
  if (store) return store;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await fs.readFile(STATS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      store = parsed && typeof parsed === "object" && parsed.users ? parsed : { users: {} };
    } catch (err) {
      if (err?.code !== "ENOENT") {
        console.error("Failed to read user-stats file, starting fresh:", err);
      }
      store = { users: {} };
    }
    return store;
  })();

  return loadPromise;
}

async function persist() {
  // Coalesce rapid writes: if a write is in progress, queue exactly one more.
  if (writing) {
    writeQueued = true;
    return;
  }
  writing = true;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STATS_FILE, JSON.stringify(store), "utf-8");
  } catch (err) {
    console.error("Failed to persist user-stats file:", err);
  } finally {
    writing = false;
    if (writeQueued) {
      writeQueued = false;
      persist();
    }
  }
}

function dayKey(date = new Date()) {
  // UTC day boundary keeps streak math deterministic across hosts.
  return date.toISOString().slice(0, 10);
}

/**
 * Records token usage for a user and refreshes their profile metadata.
 * @param {string} userId
 * @param {{ username?: string, displayName?: string, avatar?: string }} profile
 * @param {number} tokens
 */
export async function recordUsage(userId, profile, tokens) {
  if (!userId) return;
  const safeTokens = Number.isFinite(tokens) && tokens > 0 ? Math.round(tokens) : 0;

  const state = await load();
  const existing = state.users[userId] || {
    username: "",
    displayName: "",
    avatar: "",
    lifetimeTokens: 0,
    peakDayTokens: 0,
    daily: {},
  };

  if (profile?.username) existing.username = profile.username;
  if (profile?.displayName) existing.displayName = profile.displayName;
  if (profile?.avatar) existing.avatar = profile.avatar;

  if (safeTokens > 0) {
    const key = dayKey();
    const nextDayTotal = (existing.daily[key] || 0) + safeTokens;
    existing.daily[key] = nextDayTotal;
    existing.lifetimeTokens += safeTokens;
    if (nextDayTotal > existing.peakDayTokens) {
      existing.peakDayTokens = nextDayTotal;
    }
  }

  state.users[userId] = existing;
  await persist();
}

function computeStreaks(daily) {
  const activeDays = new Set(
    Object.keys(daily).filter((key) => (daily[key] || 0) > 0),
  );
  if (activeDays.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Current streak: walk backwards from today (or yesterday) while days are active.
  let currentStreak = 0;
  const cursor = new Date();
  if (!activeDays.has(dayKey(cursor))) {
    // Allow the streak to remain "alive" if yesterday was active but today isn't yet.
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (activeDays.has(dayKey(cursor))) {
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Longest streak: scan sorted unique days for the longest consecutive run.
  const sorted = [...activeDays].sort();
  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`);
    const curr = new Date(`${sorted[i]}T00:00:00Z`);
    const diffDays = Math.round((curr - prev) / 86_400_000);
    if (diffDays === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
  }

  return { currentStreak, longestStreak };
}

/**
 * Builds a heatmap matrix for the trailing `weeks` window.
 * Returns { weeks: number[][] } where each inner array is a week (7 days,
 * Sunday..Saturday) of token counts, plus the max value in the window.
 */
function buildHeatmap(daily, weeks = 30) {
  const today = new Date();
  // Anchor to the most recent Saturday so columns align to week boundaries.
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const endDow = end.getUTCDay(); // 0 = Sunday
  end.setUTCDate(end.getUTCDate() + (6 - endDow)); // move to Saturday

  const totalDays = weeks * 7;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));

  const columns = [];
  let max = 0;
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      const value = daily[dayKey(cursor)] || 0;
      if (value > max) max = value;
      week.push(value);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(week);
  }

  return { columns, max };
}

/**
 * Returns aggregated stats for rendering. Always returns a usable object,
 * even for users with no recorded activity.
 */
export async function getUserStats(userId, { weeks = 30 } = {}) {
  const state = await load();
  const record = state.users[userId];

  if (!record) {
    return {
      username: "",
      displayName: "",
      avatar: "",
      lifetimeTokens: 0,
      peakDayTokens: 0,
      currentStreak: 0,
      longestStreak: 0,
      heatmap: buildHeatmap({}, weeks),
      hasData: false,
    };
  }

  const { currentStreak, longestStreak } = computeStreaks(record.daily);

  return {
    username: record.username,
    displayName: record.displayName,
    avatar: record.avatar,
    lifetimeTokens: record.lifetimeTokens,
    peakDayTokens: record.peakDayTokens,
    currentStreak,
    longestStreak,
    heatmap: buildHeatmap(record.daily, weeks),
    hasData: record.lifetimeTokens > 0,
  };
}
