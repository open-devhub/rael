import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { TinyFish } from "@tiny-fish/sdk";
import "dotenv/config";

export const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});
export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

/**
 * The SDK defaults to a 10 minute timeout, which is far too long for a tool
 * call the user is actively waiting on in Discord. The timeout covers the whole
 * retry sequence, not each attempt, so this is a hard ceiling on a search.
 */
const SEARCH_TIMEOUT_MS = 15_000;

let tinyFishClient: TinyFish | null = null;

export function getTinyFish() {
  if (!process.env.TINYFISH_API_KEY) {
    throw new Error("TINYFISH_API_KEY is missing. Set it in your environment.");
  }

  if (!tinyFishClient) {
    tinyFishClient = new TinyFish({
      apiKey: process.env.TINYFISH_API_KEY,
      timeout: SEARCH_TIMEOUT_MS,
      // Retries only fire on 408, 429 and 5xx responses.
      maxRetries: 2,
    });
  }

  return tinyFishClient;
}
