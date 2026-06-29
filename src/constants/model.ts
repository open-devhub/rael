export const DEFAULT_MODEL_ID = "openai/gpt-oss-120b";

export const VISION_MODEL_ID = "meta-llama/llama-4-scout-17b-16e-instruct";

export const MODELS = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    provider: "groq",
    description: "General purpose model with strong reasoning.",
    aliases: ["gpt-oss", "oss", "gpt-oss-120b"],
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "llama-3.3",
    provider: "groq",
    description: "General purpose model with meta intelligence.",
    aliases: ["llama", "os", "llama-3.3"],
  },
  {
    id: "qwen/qwen3-32b",
    name: "Qwen 3 32B",
    provider: "groq",
    description: "Versatile model with balanced performance.",
    aliases: ["qwen", "qwen3", "qwen3-32b"],
  },
  //////
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron",
    provider: "openrouter",
    description: "Lightweight assistant for everyday tasks.",
    aliases: ["nemotron", "nvidia"],
  },
  {
    id: "nex-agi/nex-n2-pro:free",
    name: "Nex N2",
    provider: "openrouter",
    description: "a latest open source model great in coding.",
    aliases: ["Nex-N2", "Nex-AGI"],
  },
  {
    id: "deepseek/deepseek-v4-flash:free",
    name: "DeepSeek V4 Flash",
    provider: "openrouter",
    description: "Fast free-tier model for quick answers.",
    aliases: ["deepseek", "v4", "flash"],
  },
  {
    id: "poolside/laguna-xs.2:free",
    name: "Laguna XS.2",
    provider: "openrouter",
    description: "Lightweight model for casual conversations.",
    aliases: ["laguna", "xs2", "poolside"],
  },
];
