import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getExa } from "../utils/ai.ts";

const MAX_CHARACTERS = 500;

export const searchTool = tool({
  description:
    "Search the web for up-to-date information, news, articles, docs, etc.",
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe("The search query to execute."),
    }),
  ),
  execute: async ({ query }) => {
    const exa = getExa();

    const result = await exa.search(query, {
      type: "fast",
      numResults: 3,
      contents: {
        highlights: {
          maxCharacters: MAX_CHARACTERS,
        },
      },
    });

    return {
      results: result.results,
    };
  },
});
