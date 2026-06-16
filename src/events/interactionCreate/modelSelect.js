import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { clearUserContext } from "../../utils/chat-context.js";
import {
  getUserModel,
  listAvailableModels,
  setUserModel,
} from "../../utils/model.js";

const COLOR_MONO = 0x2b2b2b;

function formatCurrentModel(model) {
  return `Current model: ${model?.name || "Unknown"} (${model?.id || "n/a"})`;
}

function buildModelEmbed(models, activeModel) {
  const lines = models.map((model) => {
    const activeMarker = model.id === activeModel?.id ? " [active]" : "";
    return `- ${model.id}${activeMarker}: ${model.name} (${model.provider}) - ${model.description}`;
  });

  return new EmbedBuilder()
    .setTitle("Model picker")
    .setColor(COLOR_MONO)
    .setDescription(
      [
        formatCurrentModel(activeModel),
        "",
        "Pick a model below to switch instantly.",
        "",
        ...lines,
      ].join("\n"),
    );
}

function buildModelSelect(models, activeModelId, userId, disabled = false) {
  const options = models.map((model) => ({
    label: model.id === activeModelId ? `* ${model.name}` : model.name,
    value: model.id,
    description: `${model.provider} - ${model.description}`.slice(0, 100),
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`model-select:${userId}`)
    .setPlaceholder("Select a model")
    .addOptions(options)
    .setDisabled(disabled);

  return [new ActionRowBuilder().addComponents(menu)];
}

export default async (client, interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (!interaction.customId.startsWith("model-select:")) return;

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
      content: "No model was selected.",
      ephemeral: true,
    });
    return;
  }

  const selected = setUserModel(interaction.user.id, selectedId);
  if (!selected) {
    await interaction.reply({
      content: "That model is not available anymore.",
      ephemeral: true,
    });
    return;
  }

  clearUserContext(interaction.user.id);

  const models = listAvailableModels();
  const activeModel = getUserModel(interaction.user.id);
  const embed = buildModelEmbed(models, activeModel);

  await interaction.update({
    embeds: [embed],
    components: buildModelSelect(
      models,
      activeModel?.id,
      interaction.user.id,
      true,
    ),
  });
};
