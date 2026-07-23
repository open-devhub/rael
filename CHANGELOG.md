# Change Log

## `v2.0.1` - 2026-07-23

### Fixed

- `/askai` (`, <question>`) no longer shows a generic error when a model succeeds but returns no text (e.g. stops after a tool call). It now falls back to the next model instead.
- Image questions retry as text-only if the vision model fails, instead of failing outright.
- Fixed a race condition where concurrent `askai` command requests could interfere with each other's model fallback.

## `v2.0.0` - 2026-06-29

### Added

- Introduced model fallback system to improve reliability and resilience

### Changed

- Migrated entire codebase to TypeScript with Bun runtime
- Reduced size of the base (system) prompt for better efficiency
- Improved context handling for more consistent behavior
- Restructured the project's file and folder organization for a cleaner, more maintainable codebase

### Removed

- Personas system
- Stock cards feature
- DevHub-related information/prompt

### Fixed

- Suppressed ping/mention behavior to prevent unintended user or role tagging

## `v1.1.1` - 2026-06-17

### Changed

- Refine bot system prompt for tone and accuracy

## `v1.1.0` - 2026-06-17

### Added

- Session-based context management system
- Session-based context redesign specification

### Changed

- Switched vision model to Groq

### Removed

- Removed redundant `clearUserContext` calls
- Removed large instruction block to reduce token usage

## `v1.0.0` - 2026-06-16

### Added

- Initial release
- Vision support, allowing Rael to read and understand image attachments
- Model switching, letting users choose between supported AI models
- Web search, giving Rael access to up to date information beyond its training data
- Live stock graphs via the `stock` command
- Token usage tracking with a clean, visual breakdown via the `usage` command

### Changed

- Renamed the bot from Pawgrammer to Rael
- Refined the persona and prefix command system carried over from the alpha release
