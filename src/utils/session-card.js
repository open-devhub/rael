import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  try {
    GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Regular.ttf"), "Inter");
    GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-SemiBold.ttf"), "InterSemiBold");
    GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Bold.ttf"), "InterBold");
    fontsRegistered = true;
  } catch (err) {
    console.error("Failed to register Inter fonts for session card:", err);
  }
}

const WIDTH = 1000;
const HEIGHT = 520;

const COLORS = {
  background: "#0a0a0a",
  border: "#1c1c1e",
  text: "#f2f2f2",
  muted: "#7a7a7a",
  divider: "#1c1c1e",
  trackEmpty: "#1a1a1d",
  // Calm blue ramp -> warning amber -> exhausted red.
  // Picked at render time based on fill ratio.
  fillLow: "#1d4ed8",
  fillMid: "#3b82f6",
  fillWarn: "#f59e0b",
  fillFull: "#ef4444",
};

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function formatTokens(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "0m";
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function pickFillColor(ratio) {
  if (ratio >= 1) return COLORS.fillFull;
  if (ratio >= 0.85) return COLORS.fillWarn;
  if (ratio >= 0.4) return COLORS.fillMid;
  return COLORS.fillLow;
}

async function loadAvatar(url) {
  if (!url) return null;
  try {
    const pngUrl = url.replace(/\.(webp|gif)(\?|$)/i, ".png$2");
    const res = await fetch(pngUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return await loadImage(buffer);
  } catch (err) {
    console.error("Failed to load avatar for session card:", err);
    return null;
  }
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

/**
 * Render the per-user session status card.
 *
 * @param {object} opts
 * @param {string}  opts.displayName
 * @param {string}  opts.handle
 * @param {string} [opts.avatarUrl]
 * @param {string} [opts.brand]
 * @param {boolean} opts.active
 * @param {number}  opts.tokensUsed
 * @param {number}  opts.tokenBudget
 * @param {number} [opts.timeRemainingMs] // ms until session expiry
 * @param {number} [opts.messageCount]
 * @param {number} [opts.imageCount]
 * @param {boolean}[opts.overBudget]
 */
export async function renderSessionCard(opts) {
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

  // ---- Header: avatar + identity ----
  const avatarSize = 110;
  const avatarX = padX;
  const avatarY = 56;
  const avatar = await loadAvatar(opts.avatarUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
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
  ctx.fillText(truncate(ctx, opts.displayName || "Unknown", 460), textX, avatarY + 52);

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

  // ---- Section label ----
  const labelY = 210;
  ctx.fillStyle = COLORS.muted;
  ctx.font = "22px InterSemiBold";
  ctx.fillText("Context window", padX, labelY);

  // Right-side status pill
  const statusText = !opts.active
    ? "Idle — no active session"
    : opts.overBudget
      ? "🚨 Session limit reached"
      : "Active";
  const statusColor = !opts.active
    ? COLORS.muted
    : opts.overBudget
      ? COLORS.fillFull
      : COLORS.fillMid;
  ctx.fillStyle = statusColor;
  ctx.font = "22px InterSemiBold";
  ctx.textAlign = "right";
  ctx.fillText(statusText, WIDTH - padX, labelY);
  ctx.textAlign = "left";

  // ---- Progress bar ----
  const budget = Math.max(1, Number(opts.tokenBudget) || 0);
  const used = Math.max(0, Number(opts.tokensUsed) || 0);
  const ratio = Math.min(1, used / budget);

  const barX = padX;
  const barY = labelY + 28;
  const barW = WIDTH - padX * 2;
  const barH = 28;
  const barR = 14;

  ctx.fillStyle = COLORS.trackEmpty;
  roundRectPath(ctx, barX, barY, barW, barH, barR);
  ctx.fill();

  if (ratio > 0) {
    const minVisible = barH; // make sure tiny progress is still visible
    const filledW = Math.max(minVisible, Math.round(barW * ratio));
    ctx.fillStyle = pickFillColor(ratio);
    roundRectPath(ctx, barX, barY, filledW, barH, barR);
    ctx.fill();
  }

  // Used / budget caption under bar
  const usedLabel = `${formatTokens(used)} / ${formatTokens(budget)} tokens`;
  const remainingLabel = `${Math.round(ratio * 100)}% used`;
  ctx.fillStyle = COLORS.text;
  ctx.font = "22px InterSemiBold";
  ctx.fillText(usedLabel, padX, barY + barH + 32);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "20px Inter";
  ctx.textAlign = "right";
  ctx.fillText(remainingLabel, WIDTH - padX, barY + barH + 32);
  ctx.textAlign = "left";

  // ---- Divider ----
  const dividerY = barY + barH + 70;
  ctx.strokeStyle = COLORS.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, dividerY);
  ctx.lineTo(WIDTH - padX, dividerY);
  ctx.stroke();

  // ---- Metrics row ----
  const metricsTop = dividerY + 46;
  const remainingTokens = Math.max(0, budget - used);
  const metrics = [
    { value: formatTokens(remainingTokens), label: "tokens remaining" },
    {
      value: opts.active ? formatDuration(opts.timeRemainingMs) : "—",
      label: "session resets in",
    },
    {
      value: opts.active ? String(opts.messageCount ?? 0) : "—",
      label: "messages",
    },
    {
      value: opts.active ? String(opts.imageCount ?? 0) : "—",
      label: "images",
    },
  ];

  const colWidth = (WIDTH - padX * 2) / metrics.length;
  metrics.forEach((metric, i) => {
    const centerX = padX + colWidth * i + colWidth / 2;

    ctx.fillStyle = COLORS.text;
    ctx.font = "42px InterBold";
    ctx.textAlign = "center";
    ctx.fillText(metric.value, centerX, metricsTop);

    ctx.fillStyle = COLORS.muted;
    ctx.font = "22px Inter";
    ctx.fillText(metric.label, centerX, metricsTop + 36);

    if (i > 0) {
      const sepX = padX + colWidth * i;
      ctx.strokeStyle = COLORS.divider;
      ctx.beginPath();
      ctx.moveTo(sepX, metricsTop - 26);
      ctx.lineTo(sepX, metricsTop + 30);
      ctx.stroke();
    }
  });
  ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}
