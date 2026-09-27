<br />
<div align="center">

  <img src="./assets/icon.png" alt="Rael" width="200" height="200" />

  <p align="center" style="margin-top: 12px;">
    <strong><small>CONVERSATION MEETS CAPABILITY</small></strong>
  </p>

  <p>
    <a href="https://github.com/goldstac/rael/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/goldstac/rael?style=flat-square&color=blue" alt="License" />
    </a>
    <img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Bun-1.2-orange?style=flat-square&logo=bun&logoColor=white" alt="Bun" />
    <img src="https://img.shields.io/badge/Discord.js-14-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord.js" />
    <img src="https://img.shields.io/badge/AI%20SDK-6.0-black?style=flat-square" alt="AI SDK" />
    <img src="https://img.shields.io/badge/Groq-Fast%20Inference-7700FF?style=flat-square&logoColor=white" alt="Groq" />
    <img src="https://img.shields.io/badge/OpenRouter-Multi--Model-FF6B35?style=flat-square&logoColor=white" alt="OpenRouter" />
    <img src="https://img.shields.io/badge/TinyFish-Search-0D6B3F?style=flat-square&logoColor=white" alt="TinyFish" />
    <img src="https://img.shields.io/badge/Zod-Validation-3E68FF?style=flat-square&logo=zod&logoColor=white" alt="Zod" />
  </p>

  <p>
    <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
    <img src="https://img.shields.io/badge/Version-2.0.1-0097e6?style=flat-square" alt="Version" />
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
$leaderboard
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

## Web Search

Rael can search the web when you ask it to do so, to provide up to date information when needed, rather than relying solely on its training data.

Search is powered by the [TinyFish Search API](https://docs.tinyfish.ai/search-api). Create a key at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) and set `TINYFISH_API_KEY` in your `.env` — see [.env.example](./.env.example) for every variable Rael reads. If the key is missing, the rest of the bot still works and only the search tool reports that it is unconfigured.

## Token Usage Tracking

Users can view their token usage at any time through a clean, image based visual breakdown rather than plain numbers.

```
$usage
$leaderboard
```

## Design Philosophy

Rael is designed to:

- Provide fast and reliable access to AI-assisted conversation
- Support multiple models and personas without complicating the interface
- Extend usefulness beyond chat and search
- Maintain a minimal and predictable command system

## License

Rael is licensed under GPL-3.0. See the full license in the [LICENSE](./LICENSE) file
