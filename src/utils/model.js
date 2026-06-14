const userModelState = new Map();

export const DEFAULT_MODEL_ID = "openai/gpt-oss-120b";

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
    id:"poolside/laguna-xs.2:free",
    name: "Laguna XS.2",
    provider: "openrouter",
    description: "Lightweight model for casual conversations.",
    aliases: ["laguna", "xs2", "poolside"],
  },
  {
    id: "deepseek/deepseek-v4-flash:free",
    name: "DeepSeek V4 Flash",
    provider: "openrouter",
    description: "Fast free-tier model for quick answers.",
    aliases: ["deepseek", "v4", "flash"],
  },
  {
    id:"nex-agi/nex-n2-pro:free",
    name:"Nex N2",
    provider:"openrouter",
    description:"a latest open source model great in coding.",
    aliases : ["Nex-N2" , "Nex-AGI"]
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron",
    provider: "openrouter",
    description: "Lightweight assistant for everyday tasks.",
    aliases: ["nemotron", "nvidia"],
  },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findModel(input) {
  const target = normalize(input);
  if (!target) return null;

  return (
    MODELS.find((model) => normalize(model.id) === target) ||
    MODELS.find((model) => normalize(model.name) === target) ||
    MODELS.find((model) =>
      Array.isArray(model.aliases)
        ? model.aliases.some((alias) => normalize(alias) === target)
        : false,
    ) ||
    null
  );
}

export function listAvailableModels() {
  return MODELS.slice();
}

export function getUserModel(userId) {
  const selectedModelId = userModelState.get(userId);
  const selected = selectedModelId
    ? MODELS.find((model) => model.id === selectedModelId)
    : null;
  return selected || MODELS.find((model) => model.id === DEFAULT_MODEL_ID) || MODELS[0];
}

export function setUserModel(userId, modelInput) {
  const model = findModel(modelInput);
  if (!model) return null;
  userModelState.set(userId, model.id);
  return model;
}

export function clearUserModel(userId) {
  return userModelState.delete(userId);
}
