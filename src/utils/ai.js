import { createGroq } from "@ai-sdk/groq";
import Exa from "exa-js";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
export const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

let exaClient;

export function getExa() {
  if (!process.env.EXA_API_KEY) {
    throw new Error("EXA_API_KEY is missing. Set it in your environment.");
  }

  if (!exaClient) {
    exaClient = new Exa(process.env.EXA_API_KEY);
  }

  return exaClient;
}
