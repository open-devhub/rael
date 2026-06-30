import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

interface DailyRecord {
  [date: string]: number;
}

interface UserRecord {
  username: string;
  displayName: string;
  avatar: string;
  lifetimeTokens: number;
  peakDayTokens: number;
  daily: DailyRecord;
}

interface StatsStore {
  users: Record<string, UserRecord>;
}

let store: StatsStore = { users: {} };
let isLoaded = false;
let writeQueued = false;
let isWriting = false;

async function loadStore(): Promise<void> {
  if (isLoaded) return;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(STATS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    store = parsed?.users ? parsed : { users: {} };
  } catch {
    store = { users: {} };
  }
  isLoaded = true;
}

async function saveStore(): Promise<void> {
  if (isWriting) {
    writeQueued = true;
    return;
  }

  isWriting = true;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STATS_FILE, JSON.stringify(store), "utf-8");
  } catch (err) {
    console.error("Failed to save stats.json:", err);
  } finally {
    isWriting = false;
    if (writeQueued) {
      writeQueued = false;
      await saveStore();
    }
  }
}

function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function recordUsage(
  userId: string,
  profile: { username?: string; displayName?: string; avatar?: string },
  tokens: number,
): Promise<void> {
  if (!userId) return;

  await loadStore();

  if (!store.users[userId]) {
    store.users[userId] = {
      username: "",
      displayName: "",
      avatar: "",
      lifetimeTokens: 0,
      peakDayTokens: 0,
      daily: {},
    };
  }

  const user = store.users[userId];

  if (profile.username) user.username = profile.username;
  if (profile.displayName) user.displayName = profile.displayName;
  if (profile.avatar) user.avatar = profile.avatar;

  const safeTokens = Math.max(0, Math.floor(tokens));
  if (safeTokens > 0) {
    const today = getDayKey();
    user.daily[today] = (user.daily[today] || 0) + safeTokens;
    user.lifetimeTokens += safeTokens;

    if (user.daily[today] > user.peakDayTokens) {
      user.peakDayTokens = user.daily[today];
    }
  }

  await saveStore();
}

function computeStreaks(daily: DailyRecord = {}) {
  const activeDays = new Set(
    Object.keys(daily).filter((d) => daily[d] && daily[d] > 0),
  );
  if (activeDays.size === 0) return { currentStreak: 0, longestStreak: 0 };

  // Current streak
  let currentStreak = 0;
  const cursor = new Date();
  if (!activeDays.has(getDayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (activeDays.has(getDayKey(cursor))) {
    currentStreak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Longest streak
  const sorted = [...activeDays].sort();
  let longestStreak = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`);
    const curr = new Date(`${sorted[i]}T00:00:00Z`);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
  }

  return { currentStreak, longestStreak };
}

export async function getUserStats(userId: string) {
  await loadStore();
  const user = store.users[userId];

  if (!user) {
    return {
      displayName: "",
      username: "",
      avatar: "",
      lifetimeTokens: 0,
      peakDayTokens: 0,
      currentStreak: 0,
      longestStreak: 0,
      heatmap: { columns: [], max: 0 },
      hasData: false,
    };
  }

  const { currentStreak, longestStreak } = computeStreaks(user.daily);

  // Build 30-week heatmap
  const weeks = 30;
  const today = new Date();
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const totalDays = weeks * 7;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));

  const columns: number[][] = [];
  let max = 0;
  const cursor = new Date(start);

  for (let w = 0; w < weeks; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      const value = user.daily[getDayKey(cursor)] || 0;
      if (value > max) max = value;
      week.push(value);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(week);
  }

  return {
    displayName: user.displayName,
    username: user.username,
    avatar: user.avatar,
    lifetimeTokens: user.lifetimeTokens,
    peakDayTokens: user.peakDayTokens,
    currentStreak,
    longestStreak,
    heatmap: { columns, max },
    hasData: user.lifetimeTokens > 0,
  };
}
