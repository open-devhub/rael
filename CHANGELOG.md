# Change Log

## `v2.0.0` - 29/06/2026

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

## `v1.1.1` - 17/06/2026

### Changed

- Refine bot system prompt for tone and accuracy

## `v1.1.0` - 17/06/2026

### Added

- Session-based context management system
- Session-based context redesign specification

### Changed

- Switched vision model to Groq

### Removed

- Removed redundant `clearUserContext` calls
- Removed large instruction block to reduce token usage

## `v1.0.0` - 16/06/2026

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
