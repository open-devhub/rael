import {
  APIConnectionError,
  APIStatusError,
  APITimeoutError,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  RateLimitError,
  SDKError,
  type SearchQueryParams,
  type SearchResult,
} from "@tiny-fish/sdk";
import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getTinyFish } from "../utils/ai.ts";

/** Snippets are already short, but cap them so a long one can't blow up the context. */
const MAX_CHARACTERS = 500;

/**
 * The Search API has no result-count parameter, so the page is trimmed here to
 * keep the tool result small.
 */
const MAX_RESULTS = 3;

/** The API rejects a `purpose` longer than this. */
const MAX_PURPOSE_CHARACTERS = 2000;

function truncate(text: string, limit: number) {
  const trimmed = text.trim();

  // The ellipsis counts towards the limit so the result never exceeds it.
  return trimmed.length > limit
    ? `${trimmed.slice(0, limit - 1).trimEnd()}…`
    : trimmed;
}

function toCompactResult(result: SearchResult) {
  return {
    title: result.title,
    url: result.url,
    siteName: result.site_name,
    snippet: truncate(result.snippet, MAX_CHARACTERS),
    // Only present for news results and some web results.
    ...(result.date ? { date: result.date } : {}),
    ...(result.publisher ? { publisher: result.publisher } : {}),
  };
}

function toFriendlyError(error: unknown) {
  if (error instanceof AuthenticationError) {
    return "Web search is not configured correctly (the TinyFish API key was rejected).";
  }

  if (error instanceof PermissionDeniedError) {
    return "Web search was refused for this account.";
  }

  if (error instanceof RateLimitError) {
    return "Web search is rate limited right now. Try again in a moment.";
  }

  if (error instanceof APITimeoutError) {
    return "Web search timed out before returning results.";
  }

  if (error instanceof APIConnectionError) {
    return "Could not reach the web search service.";
  }

  if (error instanceof InternalServerError) {
    return "The web search service is temporarily unavailable. Try again shortly.";
  }

  // Covers the remaining HTTP failures, such as 402 (search access required).
  if (error instanceof APIStatusError) {
    return `Web search failed with status ${error.statusCode}.`;
  }

  // Client-side request validation surfaces as a plain SDKError.
  if (error instanceof SDKError) {
    return `Web search could not run: ${error.message}`;
  }

  // A missing key throws before any request, so report it as configuration.
  if (!process.env.TINYFISH_API_KEY) {
    return "Web search is not configured (TINYFISH_API_KEY is not set).";
  }

  return "An unknown error occurred while searching the web.";
}

export const searchTool = tool({
  description:
    "Search the web for up-to-date information, news, articles, docs, etc.",
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe("The search query to execute."),
      purpose: z
        .string()
        .optional()
        .describe(
          "Optional short statement of why you are searching, e.g. 'Find the current stable Node.js release'. Improves result quality.",
        ),
    }),
  ),
  execute: async ({ query, purpose }) => {
    // The API requires a non-empty query, so fail before spending a request.
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return { error: "The search query was empty.", results: [] };
    }

    const trimmedPurpose = purpose?.trim();

    // `purpose` must be omitted rather than sent empty, and the project runs
    // with exactOptionalPropertyTypes, so it is spread in only when present.
    const params: SearchQueryParams = {
      query: trimmedQuery,
      ...(trimmedPurpose
        ? { purpose: trimmedPurpose.slice(0, MAX_PURPOSE_CHARACTERS) }
        : {}),
    };

    try {
      const response = await getTinyFish().search.query(params);
      const results = response.results
        .slice(0, MAX_RESULTS)
        .map(toCompactResult);

      if (results.length === 0) {
        return {
          results: [],
          message: `No web results found for "${trimmedQuery}". Say so instead of guessing.`,
        };
      }

      return { results };
    } catch (error) {
      // The model only sees the friendly message, so keep the cause in the logs.
      console.error("[webSearch] TinyFish search failed:", error);

      return { error: toFriendlyError(error), results: [] };
    }
  },
});
