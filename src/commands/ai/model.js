import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { clearUserContext } from "../../utils/chat-context.js";
import {
  clearUserModel,
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

export default {
  name: "model",
  description: "List or switch AI models",
  aliases: ["models", "aimodel", "ai-model"],
  callback: async (client, message, args) => {
    try {
      if (message.author.bot) return;

      const models = listAvailableModels();
      const activeModel = getUserModel(message.author.id);

      if (
        !args.length ||
        ["list", "ls", "all"].includes(args[0].toLowerCase())
      ) {
        const embed = buildModelEmbed(models, activeModel);
        const components = buildModelSelect(
          models,
          activeModel?.id,
          message.author.id,
        );

        const replyMessage = await message.reply({
          embeds: [embed],
          components,
        });

        setTimeout(() => {
          replyMessage
            .edit({
              components: buildModelSelect(
                models,
                activeModel?.id,
                message.author.id,
                true,
              ),
            })
            .catch(() => null);
        }, 60_000);
        return;
      }

      const action = args[0].toLowerCase();

      if (["current", "status", "now", "active", "which"].includes(action)) {
        await message.reply(formatCurrentModel(activeModel));
        return;
      }

      if (["default", "reset", "clear"].includes(action)) {
        clearUserModel(message.author.id);
        clearUserContext(message.author.id);

        const fallbackModel = getUserModel(message.author.id);
        await message.reply(
          `Model reset to default: ${fallbackModel?.name || "Unknown"} (${fallbackModel?.id || "n/a"}). AI context was cleared too.`,
        );
        return;
      }

      const requestedModel = ["set", "use", "switch"].includes(action)
        ? args.slice(1).join(" ").trim()
        : args.join(" ").trim();

      if (!requestedModel) {
        await message.reply(
          [
            "Choose a model to switch to.",
            "Examples:",
            "- `$model list`",
            "- `$model current`",
            "- `$model set deepseek`",
          ].join("\n"),
        );
        return;
      }

      const selected = setUserModel(message.author.id, requestedModel);

      if (!selected) {
        await message.reply(
          [
            `Model \`${requestedModel}\` was not found.`,
            "Use `$model list` to see available models.",
          ].join("\n"),
        );
        return;
      }

      clearUserContext(message.author.id);

      await message.reply(
        [
          `Switched to ${selected.name} (${selected.id}).`,
          "AI context was cleared to avoid mixing styles.",
        ].join("\n"),
      );
    } catch (err) {
      console.error(err);
      await message.reply("Could not switch model right now.");
    }
  },
};
