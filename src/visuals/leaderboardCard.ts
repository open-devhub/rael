import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type CanvasRenderingContext2D,
} from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";
import type { LeaderboardEntry } from "../utils/stats.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "..", "..", "assets", "fonts");

let fontsRegistered = false;

function ensureFonts() {
  if (fontsRegistered) return;
  try {
    GlobalFonts.registerFromPath(
      path.join(FONTS_DIR, "Inter-Regular.ttf"),
      "Inter",
    );
    GlobalFonts.registerFromPath(
      path.join(FONTS_DIR, "Inter-SemiBold.ttf"),
      "InterSemiBold",
    );
    GlobalFonts.registerFromPath(
      path.join(FONTS_DIR, "Inter-Bold.ttf"),
      "InterBold",
    );
    fontsRegistered = true;
  } catch (err) {
    console.error("Failed to register fonts:", err);
  }
}

const WIDTH = 1000;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 140;
const PADDING_BOTTOM = 50;

const COLORS = {
  background: "#0a0a0a",
  border: "#1c1c1e",
  text: "#f2f2f2",
  muted: "#7a7a7a",
  divider: "#1c1c1e",
  rank1: "#1d4ed8",
  rank2: "#C0C0C0",
  rank3: "#CD7F32",
  rowHover: "#111113",
};

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function formatTokens(value: number): string {
  const n = Number(value) || 0;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

async function loadAvatar(url?: string | null) {
  if (!url) return null;
  try {
    const pngUrl = url.replace(/\.(webp|gif)(\?|$)/i, ".png$2");
    const res = await fetch(pngUrl);
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

function truncate(ctx: any, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function rankColor(rank: number): string {
  if (rank === 1) return COLORS.rank1;
  if (rank === 2) return COLORS.rank2;
  if (rank === 3) return COLORS.rank3;
  return COLORS.muted;
}

export interface LeaderboardCardOptions {
  entries: LeaderboardEntry[];
  brand?: string;
}

export async function renderLeaderboardCard(
  opts: LeaderboardCardOptions,
): Promise<Buffer> {
  ensureFonts();

  try {
    const height =
      HEADER_HEIGHT + opts.entries.length * ROW_HEIGHT + PADDING_BOTTOM;
    const canvas = createCanvas(WIDTH, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = COLORS.background;
    roundRectPath(ctx, 0, 0, WIDTH, height, 28);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.border;
    roundRectPath(ctx, 1, 1, WIDTH - 2, height - 2, 28);
    ctx.stroke();

    const padX = 60;

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = "44px InterBold";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Leaderboard", padX, 90);

    if (opts.brand) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = "34px InterSemiBold";
      ctx.textAlign = "right";
      ctx.fillText(opts.brand, WIDTH - padX, 90);
      ctx.textAlign = "left";
    }

    // Divider under header
    ctx.strokeStyle = COLORS.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, HEADER_HEIGHT - 10);
    ctx.lineTo(WIDTH - padX, HEADER_HEIGHT - 10);
    ctx.stroke();

    // Preload all avatars
    const avatars = await Promise.all(
      opts.entries.map((e) => loadAvatar(e.avatar)),
    );

    // Rows
    for (let i = 0; i < opts.entries.length; i++) {
      const entry = opts.entries[i];
      const rank = i + 1;
      const rowY = HEADER_HEIGHT + i * ROW_HEIGHT;

      // Alternating row background
      if (i % 2 === 1) {
        ctx.fillStyle = COLORS.rowHover;
        ctx.fillRect(padX - 20, rowY, WIDTH - (padX - 20) * 2, ROW_HEIGHT);
      }

      const rowCenterY = rowY + ROW_HEIGHT / 2;

      // Rank number
      ctx.fillStyle = rankColor(rank);
      ctx.font = rank <= 3 ? "28px InterBold" : "24px InterSemiBold";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${rank}`, padX, rowCenterY);

      // Avatar
      let nameX: number;
      if (avatars[i]) {
        const avatarSize = 36;
        const avatarX = padX + 60;
        const avatarY = rowCenterY - avatarSize / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2,
          0,
          Math.PI * 2,
        );
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatars[i], avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        nameX = avatarX + avatarSize + 16;
      } else {
        nameX = padX + 60;
      }

      // Display name
      ctx.fillStyle = COLORS.text;
      ctx.font = "24px InterSemiBold";
      ctx.textBaseline = "middle";
      ctx.fillText(
        truncate(ctx, entry.displayName || "Unknown", 400),
        nameX,
        rowCenterY,
      );

      // Token count (right-aligned)
      ctx.fillStyle = COLORS.muted;
      ctx.font = "22px Inter";
      ctx.textAlign = "right";
      ctx.fillText(
        `${formatTokens(entry.lifetimeTokens)} tokens`,
        WIDTH - padX,
        rowCenterY,
      );
      ctx.textAlign = "left";
    }

    return canvas.toBuffer("image/png");
  } catch (err) {
    console.error("[LeaderboardCard] Failed to render leaderboard card:", err);
    throw err;
  }
}
