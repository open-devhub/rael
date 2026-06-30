import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");

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
const HEIGHT = 600;

const COLORS = {
  background: "#0a0a0a",
  border: "#1c1c1e",
  text: "#f2f2f2",
  muted: "#7a7a7a",
  divider: "#1c1c1e",
  cellEmpty: "#1a1a1d",
  ramp: ["#10213f", "#16306e", "#1d4ed8", "#3b82f6"],
};

function roundRectPath(
  ctx: any,
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

function cellColor(value: number, max: number): string {
  if (!value || value <= 0) return COLORS.cellEmpty;
  const ratio = Math.sqrt(value / max);
  const index = Math.min(
    COLORS.ramp.length - 1,
    Math.floor(ratio * COLORS.ramp.length),
  );
  return COLORS.ramp[index] || "";
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

export interface StatsCardOptions {
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  brand?: string;
  heatmap: { columns: number[][]; max: number };
  lifetimeTokens: number;
  peakDayTokens: number;
  currentStreak: number;
  longestStreak: number;
}

export async function renderStatsCard(opts: StatsCardOptions): Promise<Buffer> {
  ensureFonts();

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = COLORS.background;
  roundRectPath(ctx, 0, 0, WIDTH, HEIGHT, 28);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.border;
  roundRectPath(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, 28);
  ctx.stroke();

  const padX = 60;

  // Avatar + Header
  const avatarSize = 110;
  const avatarX = padX;
  const avatarY = 56;
  const avatar = await loadAvatar(opts.avatarUrl);

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
  if (avatar) {
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  }
  ctx.restore();

  const textX = avatarX + avatarSize + 36;
  ctx.fillStyle = COLORS.text;
  ctx.font = "44px InterBold";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(
    truncate(ctx, opts.displayName || "Unknown", 460),
    textX,
    avatarY + 52,
  );

  ctx.fillStyle = COLORS.muted;
  ctx.font = "26px Inter";
  ctx.fillText(truncate(ctx, opts.handle || "", 460), textX, avatarY + 90);

  if (opts.brand) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = "34px InterSemiBold";
    ctx.textAlign = "right";
    ctx.fillText(opts.brand, WIDTH - padX, avatarY + 70);
    ctx.textAlign = "left";
  }

  // Heatmap
  const heatmap = opts.heatmap;
  const weeks = heatmap.columns.length || 30;
  const rows = 7;
  const gridTop = 190;
  const gridBottom = 430;
  const gridLeft = padX;
  const gridRight = WIDTH - padX;

  const gap = 6;
  const cell = Math.min(
    (gridRight - gridLeft - (weeks - 1) * gap) / weeks,
    (gridBottom - gridTop - (rows - 1) * gap) / rows,
  );
  const radius = Math.max(3, cell * 0.28);

  for (let c = 0; c < weeks; c++) {
    const week = heatmap.columns[c] || [];
    for (let r = 0; r < rows; r++) {
      const value = week[r] || 0;
      const x = gridLeft + c * (cell + gap);
      const y = gridTop + r * (cell + gap);
      ctx.fillStyle = cellColor(value, heatmap.max);
      roundRectPath(ctx, x, y, cell, cell, radius);
      ctx.fill();
    }
  }

  // Metrics
  const metricsTop = 480;
  ctx.strokeStyle = COLORS.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, metricsTop - 24);
  ctx.lineTo(WIDTH - padX, metricsTop - 24);
  ctx.stroke();

  const metrics = [
    { value: formatTokens(opts.lifetimeTokens), label: "lifetime tokens" },
    { value: formatTokens(opts.peakDayTokens), label: "peak day" },
    { value: `${opts.currentStreak} days`, label: "current streak" },
    { value: `${opts.longestStreak} days`, label: "longest streak" },
  ];

  const colWidth = (WIDTH - padX * 2) / metrics.length;

  metrics.forEach((metric, i) => {
    const centerX = padX + colWidth * i + colWidth / 2;
    ctx.fillStyle = COLORS.text;
    ctx.font = "46px InterBold";
    ctx.textAlign = "center";
    ctx.fillText(metric.value, centerX, metricsTop + 28);

    ctx.fillStyle = COLORS.muted;
    ctx.font = "24px Inter";
    ctx.fillText(metric.label, centerX, metricsTop + 64);

    if (i > 0) {
      const sepX = padX + colWidth * i;
      ctx.strokeStyle = COLORS.divider;
      ctx.beginPath();
      ctx.moveTo(sepX, metricsTop - 4);
      ctx.lineTo(sepX, metricsTop + 56);
      ctx.stroke();
    }
  });

  ctx.textAlign = "left";
  return canvas.toBuffer("image/png");
}
