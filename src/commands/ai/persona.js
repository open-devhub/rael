import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { clearUserContext } from "../../utils/chat-context.js";
import {
  clearUserPersona,
  getUserPersona,
  listAvailablePersonas,
  setUserPersona,
} from "../../utils/persona.js";

function formatCurrentPersona(persona) {
  return `Current persona: ${persona?.name || "Unknown"} (${persona?.id || "n/a"})`;
}

function buildPersonaEmbed(personas, activePersona) {
  return new EmbedBuilder()
    .setTitle("Persona picker")
    .setColor(0x2b2b2b)
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

export default {
  name: "persona",
  description: "List or switch AI personas",
  aliases: ["personaai", "mode", "character"],
  callback: async (client, message, args) => {
    try {
      if (message.author.bot) return;

      const personas = listAvailablePersonas();
      const activePersona = getUserPersona(message.author.id);

      if (
        !args.length ||
        ["list", "ls", "all"].includes(args[0].toLowerCase())
      ) {
        const embed = buildPersonaEmbed(personas, activePersona);
        const components = buildPersonaSelect(
          personas,
          activePersona?.id,
          message.author.id,
        );

        const replyMessage = await message.reply({
          embeds: [embed],
          components,
        });

        setTimeout(() => {
          replyMessage
            .edit({
              components: buildPersonaSelect(
                personas,
                activePersona?.id,
                message.author.id,
                true,
              ),
            })
            .catch(() => null);
        }, 60_000);
        return;
      }

      const action = args[0].toLowerCase();

      if (
        ["current", "status", "now", "active", "who", "me"].includes(action)
      ) {
        await message.reply(formatCurrentPersona(activePersona));
        return;
      }

      if (["default", "reset", "clear"].includes(action)) {
        clearUserPersona(message.author.id);
        clearUserContext(message.author.id);

        const fallbackPersona = getUserPersona(message.author.id);
        await message.reply(
          `Persona reset to default: ${fallbackPersona?.name || "Teenager Kai"} (${fallbackPersona?.id || "teenager"}). AI context was cleared too.`,
        );
        return;
      }

      const requestedPersona = ["set", "use", "switch"].includes(action)
        ? args.slice(1).join(" ").trim()
        : args.join(" ").trim();

      if (!requestedPersona) {
        await message.reply(
          [
            "Choose a persona to switch to.",
            "Examples:",
            "- `$persona list`",
            "- `$persona current`",
            "- `$persona who`",
            "- `$persona set debugcoach`",
            "- `$persona motivator`",
          ].join("\n"),
        );
        return;
      }

      const selected = setUserPersona(message.author.id, requestedPersona);

      if (!selected) {
        await message.reply(
          [
            `Persona \`${requestedPersona}\` was not found.`,
            "Use `$persona list` to see available personas.",
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
      await message.reply("Could not switch persona right now.");
    }
  },
};
