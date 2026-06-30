import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { HOURLY_TOKEN_LIMIT } from "../constants/usage.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE_FILE = path.join(__dirname, "..", "..", "data", "usage.json");

interface UserUsage {
  tokens: number;
  lastReset: number;
}

interface UsageData {
  [userId: string]: UserUsage;
}

let usageCache: UsageData | null = null;

async function loadUsage(): Promise<UsageData> {
  if (usageCache !== null) return usageCache;

  try {
    await fs.mkdir(path.dirname(USAGE_FILE), { recursive: true });
    const raw = await fs.readFile(USAGE_FILE, "utf-8");
    usageCache = JSON.parse(raw);
    return usageCache!;
  } catch {
    usageCache = {};
    return usageCache;
  }
}

async function saveUsage(data: UsageData): Promise<void> {
  usageCache = data;
  await fs.mkdir(path.dirname(USAGE_FILE), { recursive: true });
  await fs.writeFile(USAGE_FILE, JSON.stringify(data), "utf-8");
}

export async function getUsage(userId: string): Promise<number> {
  const data = await loadUsage();
  const record = data[userId];
  if (!record) return 0;

  const now = Date.now();
  if (now - record.lastReset > 60 * 60 * 1000) {
    record.tokens = 0;
    record.lastReset = now;
    await saveUsage(data);
    return 0;
  }
  return record.tokens;
}

export async function setUsage(
  userId: string,
  tokensToAdd: number,
): Promise<void> {
  const data = await loadUsage();
  const now = Date.now();

  if (!data[userId]) {
    data[userId] = { tokens: 0, lastReset: now };
  }

  const record = data[userId];
  if (now - record.lastReset > 60 * 60 * 1000) {
    record.tokens = 0;
    record.lastReset = now;
  }

  record.tokens += Math.max(0, tokensToAdd);
  await saveUsage(data);
}

export async function canUseAI(userId: string) {
  const tokensUsed = await getUsage(userId);
  const data = await loadUsage();
  const record = data[userId];
  const lastReset = record?.lastReset ?? Date.now();
  const msUntilReset = Math.max(0, 60 * 60 * 1000 - (Date.now() - lastReset));

  return {
    allowed: tokensUsed < HOURLY_TOKEN_LIMIT,
    tokensUsed,
    msUntilReset,
  };
}

export function formatTimeLeft(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return minutes <= 1 ? "less than a minute" : `${minutes} minutes`;
}
