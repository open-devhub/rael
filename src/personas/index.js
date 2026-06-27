export const DEFAULT_PERSONA_ID = "teenager";

export const PERSONAS = [
  {
    id: "teenager",
    name: "Teenager",
    description: "Chaotic English Gen Z/Alpha Discord lad.",
    fileName: "teenager.md",
    aliases: ["bot", "teen", "genz", "english", "british", "lad"],
  },
  {
    id: "gf",
    name: "Girlfriend",
    description: "Caring, protective, girlfriend-style banter.",
    fileName: "flirting.md",
    aliases: [
      "flirty",
      "flirting",
      "flriting",
      "girlfriend",
      "gfmode",
      "spark",
      "charm",
      "rizz",
      "banter",
    ],
  },
  {
    id: "idea-validator",
    name: "Idea Validator",
    description: "Objective, critical, and constructive idea feedback.",
    fileName: "idea-validator.md",
    aliases: ["validator", "validation", "idea", "feedback", "critic"],
  },
  {
    id: "debugcoach",
    name: "Debug Coach",
    description: "Step-by-step debugging partner using hypothesis testing.",
    fileName: "debugcoach.md",
    aliases: ["debug", "coach", "rubberduck", "duck"],
  },
  {
    id: "interviewer",
    name: "Interview Buddy",
    description:
      "Mock interviewer for DSA, system design, and behavior rounds.",
    fileName: "interviewer.md",
    aliases: ["interview", "mock", "practice"],
  },
  {
    id: "motivator",
    name: "Sprint Buddy",
    description: "Focus and momentum persona for shipping tasks.",
    fileName: "motivator.md",
    aliases: ["hype", "focus", "sprint", "study"],
  },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findPersona(input) {
  const target = normalize(input);
  if (!target) {
    return null;
  }

  return (
    PERSONAS.find((persona) => normalize(persona.id) === target) ||
    PERSONAS.find((persona) => normalize(persona.name) === target) ||
    PERSONAS.find((persona) =>
      Array.isArray(persona.aliases)
        ? persona.aliases.some((alias) => normalize(alias) === target)
        : false,
    ) ||
    null
  );
}

export function getPersonaById(id) {
  return PERSONAS.find((persona) => persona.id === id) || null;
}

export function getDefaultPersona() {
  return getPersonaById(DEFAULT_PERSONA_ID) || PERSONAS[0] || null;
}
