import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import {
  getUserPersona,
  listAvailablePersonas,
  setUserPersona,
} from "../../utils/persona.js";

const COLOR_MONO = 0x2b2b2b;

function formatCurrentPersona(persona) {
  return `Current persona: ${persona?.name || "Unknown"} (${persona?.id || "n/a"})`;
}

function buildPersonaEmbed(personas, activePersona) {
  return new EmbedBuilder()
    .setTitle("Persona picker")
    .setColor(COLOR_MONO)
    .setDescription(
      [
        formatCurrentPersona(activePersona),
        "",
        "Pick a persona below to switch instantly.",
        `Available personas: ${personas.length}`,
      ].join("\n"),
    );
}

function buildPersonaSelect(
  personas,
  activePersonaId,
  userId,
  disabled = false,
) {
  const options = personas.map((persona) => ({
    label: persona.id === activePersonaId ? `* ${persona.name}` : persona.name,
    value: persona.id,
    description: persona.description.slice(0, 100),
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`persona-select:${userId}`)
    .setPlaceholder("Select a persona")
    .addOptions(options)
    .setDisabled(disabled);

  return [new ActionRowBuilder().addComponents(menu)];
}

export default async (client, interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (!interaction.customId.startsWith("persona-select:")) return;

  const [, ownerId] = interaction.customId.split(":");
  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: "This menu is only for the person who requested it.",
      ephemeral: true,
    });
    return;
  }

  const selectedId = interaction.values?.[0];
  if (!selectedId) {
    await interaction.reply({
      content: "No persona was selected.",
      ephemeral: true,
    });
    return;
  }

  const selected = setUserPersona(interaction.user.id, selectedId);
  if (!selected) {
    await interaction.reply({
      content: "That persona is not available anymore.",
      ephemeral: true,
    });
    return;
  }

  const personas = listAvailablePersonas();
  const activePersona = getUserPersona(interaction.user.id);
  const embed = buildPersonaEmbed(personas, activePersona);

  await interaction.update({
    embeds: [embed],
    components: buildPersonaSelect(
      personas,
      activePersona?.id,
      interaction.user.id,
      true,
    ),
  });
};
