import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PERSONAS,
  findPersona,
  getDefaultPersona,
  getPersonaById,
} from "../personas/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const personasDirectory = path.join(__dirname, "..", "personas");

const userPersonaState = new Map();
const personaPromptCache = new Map();

export function listAvailablePersonas() {
  return PERSONAS.slice();
}

export function getUserPersona(userId) {
  const selectedPersonaId = userPersonaState.get(userId);
  const selectedPersona = selectedPersonaId
    ? getPersonaById(selectedPersonaId)
    : null;
  return selectedPersona || getDefaultPersona();
}

export function setUserPersona(userId, personaInput) {
  const persona = findPersona(personaInput);
  if (!persona) {
    return null;
  }

  userPersonaState.set(userId, persona.id);
  return persona;
}

export function clearUserPersona(userId) {
  return userPersonaState.delete(userId);
}

function getPersonaPrompt(persona) {
  if (!persona?.fileName) {
    return "";
  }

  const cacheKey = persona.fileName;
  if (personaPromptCache.has(cacheKey)) {
    return personaPromptCache.get(cacheKey);
  }

  const filePath = path.join(personasDirectory, persona.fileName);

  try {
    const contents = fs.readFileSync(filePath, "utf8").trim();
    personaPromptCache.set(cacheKey, contents);
    return contents;
  } catch (error) {
    console.error(`Failed to load persona file: ${filePath}`, error);
    return "";
  }
}

export function getUserPersonaPrompt(userId) {
  const persona = getUserPersona(userId);
  const prompt = getPersonaPrompt(persona);
  return { persona, prompt };
}
