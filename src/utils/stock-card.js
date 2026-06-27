import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");

// Register Inter once at module load (mirrors stats-card.js).
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
    console.error("Failed to register Inter fonts for stock card:", err);
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
  up: "#22c55e",
  down: "#ef4444",
  neutral: "#3b82f6",
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

function formatPrice(value, currency) {
  const n = Number(value) || 0;
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === "USD" ? "$" : "";
  return symbol
    ? `${symbol}${formatted}`
    : `${formatted} ${currency || ""}`.trim();
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
 * Draws the price line + soft area fill into the given rectangle.
 */
function drawChart(ctx, series, rect, color) {
  const { x, y, w, h } = rect;
  if (!series || series.length < 2) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = "24px Inter";
    ctx.textAlign = "center";
    ctx.fillText("No chart data available", x + w / 2, y + h / 2);
    ctx.textAlign = "left";
    return;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = w / (series.length - 1);

  const points = series.map((value, i) => ({
    px: x + i * stepX,
    // Pad 8% top/bottom so the line never touches the edges.
    py: y + h - ((value - min) / range) * (h * 0.84) - h * 0.08,
  }));

  // Soft gradient area fill under the line.
  const gradient = ctx.createLinearGradient(0, y, 0, y + h);
  gradient.addColorStop(0, `${color}33`);
  gradient.addColorStop(1, `${color}00`);

  ctx.beginPath();
  ctx.moveTo(points[0].px, y + h);
  for (const p of points) ctx.lineTo(p.px, p.py);
  ctx.lineTo(points[points.length - 1].px, y + h);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Price line.
  ctx.beginPath();
  ctx.moveTo(points[0].px, points[0].py);
  for (const p of points) ctx.lineTo(p.px, p.py);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";
  ctx.stroke();

  // End marker dot.
  const last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.px, last.py, 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Renders the stock card to a PNG buffer.
 * @param {object} opts
 * @param {string} opts.symbol
 * @param {string} opts.name
 * @param {string} [opts.exchange]
 * @param {string} [opts.currency]
 * @param {number} opts.price
 * @param {number} opts.change
 * @param {number} opts.percentChange
 * @param {number[]} opts.series
 * @param {string} [opts.brand]
 * @returns {Buffer}
 */
export function renderStockCard(opts) {
  ensureFonts();

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const isUp = (Number(opts.change) || 0) >= 0;
  const accent =
    (Number(opts.change) || 0) === 0
      ? COLORS.neutral
      : isUp
        ? COLORS.up
        : COLORS.down;

  // Background + subtle border.
  ctx.fillStyle = COLORS.background;
  roundRectPath(ctx, 0, 0, WIDTH, HEIGHT, 28);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.border;
  roundRectPath(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, 28);
  ctx.stroke();

  const padX = 60;
  const topY = 80;

  // ---- Header: symbol + name ----
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.text;
  ctx.font = "56px InterBold";
  ctx.fillText(truncate(ctx, opts.symbol || "—", 520), padX, topY);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "26px Inter";
  const subtitle = [opts.name, opts.exchange].filter(Boolean).join("  •  ");
  ctx.fillText(truncate(ctx, subtitle, 560), padX, topY + 40);

  // ---- Brand (top right) ----
  if (opts.brand) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = "34px InterSemiBold";
    ctx.textAlign = "right";
    ctx.fillText(opts.brand, WIDTH - padX, topY - 8);
    ctx.textAlign = "left";
  }

  // ---- Price + change (right aligned) ----
  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.text;
  ctx.font = "60px InterBold";
  ctx.fillText(
    formatPrice(opts.price, opts.currency),
    WIDTH - padX,
    topY + 110,
  );

  const sign = isUp ? "+" : "";
  const changeText = `${sign}${(Number(opts.change) || 0).toFixed(2)} (${sign}${(Number(opts.percentChange) || 0).toFixed(2)}%)`;
  ctx.fillStyle = accent;
  ctx.font = "30px InterSemiBold";
  ctx.fillText(changeText, WIDTH - padX, topY + 152);
  ctx.textAlign = "left";

  // ---- Chart ----
  drawChart(
    ctx,
    opts.series,
    { x: padX, y: 300, w: WIDTH - padX * 2, h: 220 },
    accent,
  );

  // ---- Divider + footer ----
  const footerY = 560;
  ctx.strokeStyle = COLORS.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, footerY - 24);
  ctx.lineTo(WIDTH - padX, footerY - 24);
  ctx.stroke();

  ctx.fillStyle = COLORS.muted;
  ctx.font = "22px Inter";
  ctx.fillText(`${opts.series?.length || 0}-day close`, padX, footerY);

  ctx.textAlign = "right";
  ctx.fillText("Data: Twelve Data", WIDTH - padX, footerY);
  ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}
