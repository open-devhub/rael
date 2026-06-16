import { tool, zodSchema } from "ai";
import { z } from "zod";

const BASE_URL = "https://api.twelvedata.com";
const CHART_POINTS = 30;

function getApiKey() {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) {
    throw new Error(
      "TWELVE_DATA_API_KEY is missing. Set it in your environment.",
    );
  }
  return key;
}

async function twelveDataFetch(endpoint, params) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  url.searchParams.set("apikey", getApiKey());

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `Twelve Data request failed (${res.status}) for ${endpoint}.`,
    );
  }

  const data = await res.json();
  // Twelve Data signals errors with `status: "error"` and an HTTP 200.
  if (data?.status === "error" || data?.code) {
    throw new Error(data?.message || "Twelve Data returned an error.");
  }
  return data;
}

/**
 * Fetches a real-time quote and recent daily closes for a symbol.
 * Shared by the `$stock` command and the AI stock tool.
 *
 * @param {string} rawSymbol  Ticker like "AAPL" or "btc/usd".
 * @returns {Promise<{
 *   symbol: string, name: string, exchange: string, currency: string,
 *   price: number, change: number, percentChange: number,
 *   open: number, high: number, low: number, previousClose: number,
 *   isMarketOpen: boolean, series: number[],
 * }>}
 */
export async function fetchStock(rawSymbol) {
  const symbol = String(rawSymbol || "")
    .trim()
    .toUpperCase();
  if (!symbol) {
    throw new Error("No symbol provided.");
  }

  // Two requests: a quote (name + live price) and a daily time series (chart).
  const [quote, timeSeries] = await Promise.all([
    twelveDataFetch("quote", { symbol }),
    twelveDataFetch("time_series", {
      symbol,
      interval: "1day",
      outputsize: CHART_POINTS,
      order: "ASC",
    }),
  ]);

  const series = Array.isArray(timeSeries?.values)
    ? timeSeries.values
        .map((point) => Number(point.close))
        .filter((n) => Number.isFinite(n))
    : [];

  const price = Number(quote.close);
  const previousClose = Number(quote.previous_close);
  const change = Number(quote.change);
  const percentChange = Number(quote.percent_change);

  return {
    symbol: quote.symbol || symbol,
    name: quote.name || symbol,
    exchange: quote.exchange || "",
    currency: quote.currency || "USD",
    price: Number.isFinite(price) ? price : 0,
    change: Number.isFinite(change) ? change : 0,
    percentChange: Number.isFinite(percentChange) ? percentChange : 0,
    open: Number(quote.open) || 0,
    high: Number(quote.high) || 0,
    low: Number(quote.low) || 0,
    previousClose: Number.isFinite(previousClose) ? previousClose : 0,
    isMarketOpen: Boolean(quote.is_market_open),
    series,
  };
}

export const stockTool = tool({
  description:
    "Get the current price and recent price history for a publicly traded stock, ETF, or crypto pair. " +
    "Call this whenever the user asks about a ticker, share price, or how a stock is doing " +
    "(e.g. 'how is AAPL doing', 'price of TSLA', 'NVDA stock'). " +
    "Returns structured data; the bot renders a visual price card for the user automatically.",
  inputSchema: zodSchema(
    z.object({
      symbol: z
        .string()
        .describe(
          "The ticker symbol to look up, e.g. 'AAPL', 'TSLA', 'NVDA', or a crypto pair like 'BTC/USD'.",
        ),
    }),
  ),
  execute: async ({ symbol }) => {
    try {
      const data = await fetchStock(symbol);
      return {
        success: true,
        symbol: data.symbol,
        name: data.name,
        exchange: data.exchange,
        currency: data.currency,
        price: data.price,
        change: data.change,
        percentChange: data.percentChange,
        isMarketOpen: data.isMarketOpen,
      };
    } catch (err) {
      return { success: false, error: String(err?.message || err) };
    }
  },
});
