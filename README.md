# Rael

Rael is an AI-powered Discord bot built for natural conversation, multi-model flexibility, and useful utilities like vision, web search, live stock data, and usage tracking.

> [!NOTE]
>
> ## What's New in v1
>
> Rael v1 builds on the alpha foundation with the following additions:
>
> - Vision support, allowing Rael to read and understand image attachments
> - Model switching, letting users choose which AI model handles their requests
> - Web search, giving Rael access to up to date information beyond its training data
> - Live stock graphs, available directly through chat
> - Token usage tracking with a clean, visual breakdown instead of raw numbers
>   The core prefix system and persona functionality from the alpha release remain, refined for consistency.

## Usage

Rael uses a prefix based interface with two modes of interaction.

- `,` for AI-first input mode
- `$` for command-first mode

### AI-first mode (`,`)

Start your message with a comma to send it directly to the AI without needing a command. You can also simply ping the bot instead of using the prefix.

Example:

```
,what is a JavaScript promise?
,explain async/await in simple terms
```

### Command-first mode (`$`)

Use this prefix for structured commands such as configuration, status checks, or utility actions.

Example:

```
$help
$ping
$persona list
$resetai
```

## Commands Overview

| Command   | Aliases                                  | Description                                  |
| --------- | ---------------------------------------- | -------------------------------------------- |
| `ai`      | `askai`                                  | Sends a prompt to the AI model               |
| `persona` | `personaai`, `mode`, `character`         | Manage or view AI personas                   |
| `model`   | `setmodel`, `models`                     | View or switch the active AI model           |
| `resetai` | `aiclear`, `clearai`, `aireset`, `reset` | Clears AI conversation context               |
| `vision`  | `see`, `image`                           | Analyzes an attached image                   |
| `search`  | `websearch`, `lookup`                    | Performs a web search and returns results    |
| `stock`   | `stocks`, `chart`                        | Displays a live stock graph                  |
| `usage`   | `tokens`, `tokenusage`                   | Displays token usage with a visual breakdown |
| `help`    | none                                     | Displays available commands and usage        |
| `ping`    | none                                     | Returns bot latency                          |

## AI Command Usage

The AI system supports both prefixes:

```
,what is event loop in Node.js?
$ai what is event loop in Node.js?
```

To reset context:

```
$resetai
or
$ai reset
```

Resetting clears conversation history and restores default behavior.

## Persona System

The persona system allows users to adjust the AI's behavior and response style.

Available subcommands:

- `$persona list`
  Displays all available personas.

- `$persona current` / `status` / `now` / `active`
  Shows the currently active persona.

- `$persona set <name>` / `use <name>` / `switch <name>`
  Switches to a selected persona.

- `$persona reset` / `clear`
  Restores the default persona and clears context.

## Model Switching

Rael supports multiple underlying AI models, allowing users to pick the one that best fits their needs, whether prioritizing speed or depth of response.

- `$model list`
  Displays all available models.

- `$model current`
  Shows the currently active model.

- `$model set <name>` / `use <name>`
  Switches to a selected model.

## Vision

Rael can read and understand images sent as attachments. Send an image along with a message and Rael will analyze the content and respond accordingly.

## Web Search

Rael can search the web when you ask it to do so, to provide up to date information when needed, rather than relying solely on its training data.

## Stock Graphs

Rael can pull up live stock charts directly in chat, just ask for it.

## Token Usage Tracking

Users can view their token usage at any time through a clean, image based visual breakdown rather than plain numbers.

```
$stats
```

## Design Philosophy

Rael is designed to:

- Provide fast and reliable access to AI-assisted conversation
- Support multiple models and personas without complicating the interface
- Extend usefulness beyond chat through vision, search, and live data
- Maintain a minimal and predictable command system
- Present usage and data visually wherever it improves clarity

## License

Rael is licensed under GPL-3.0. See the full license in the [LICENSE](./LICENSE) file
