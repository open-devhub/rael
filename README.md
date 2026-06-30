<br />
<div align="center">

  <img src="./assets/icon.png" alt="Rael" width="200" height="200" />

  <p align="center" style="margin-top: 12px;">
    <strong><small>CONVERSATION MEETS CAPABILITY</small></strong>
  </p>

</div>

# Rael

Rael is an AI-powered Discord bot built for natural conversation, multi-model flexibility, and useful utilities like vision, web search, live stock data, and usage tracking.

> [!NOTE]
>
> ## What's New in v2
>
> Rael v2 focuses on a leaner, faster, and more reliable experience with a complete internal overhaul.
>
> - Migrated the entire project to **TypeScript** and **Bun** for improved performance and maintainability
> - Introduced automatic **model fallbacks** to keep requests running even when a provider is unavailable
> - Reworked the conversation context pipeline for more consistent responses
> - Reduced the base system prompt to improve efficiency and lower token usage
> - Restructured the project's file and folder organization for a cleaner, more maintainable codebase
> - Removed personas and stock cards to simplify the overall experience
> - Removed DevHub-specific prompt information, making Rael more general-purpose
> - Added automatic ping suppression to prevent unintended user or role mentions

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
$usage
$stats
```

## AI Command Usage

The AI system supports both prefixes and tagging:

```
,what is event loop in Node.js?
$ai what is event loop in Node.js?
@Rael what is event loop in Node.js?
```

To reset context:

```
$resetctx
or
$resetai
or
$clearctx
```

Resetting clears conversation history and restores default behavior.

## Vision

Rael can read and understand images sent as attachments. Send an image along with a message and Rael will analyze the content and respond accordingly.

## Web Search

Rael can search the web when you ask it to do so, to provide up to date information when needed, rather than relying solely on its training data.

## Token Usage Tracking

Users can view their token usage at any time through a clean, image based visual breakdown rather than plain numbers.

```
$usage
```

## Design Philosophy

Rael is designed to:

- Provide fast and reliable access to AI-assisted conversation
- Support multiple models and personas without complicating the interface
- Extend usefulness beyond chat and search
- Maintain a minimal and predictable command system

## License

Rael is licensed under GPL-3.0. See the full license in the [LICENSE](./LICENSE) file
