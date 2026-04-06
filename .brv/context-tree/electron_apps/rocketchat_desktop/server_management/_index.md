---
children_hash: 707871379e0c6b3e7183e84c01fb99078ecdc40a73a76a55fd54e0e95a2d614c
compression_ratio: 0.5378346915017462
condensation_order: 0
covers: [server_loading_and_persistence.md, server_url_resolution_system.md]
covers_token_total: 859
summary_level: d0
token_count: 462
type: summary
---
# Server Management

The server management system handles loading, persisting, and resolving Rocket.Chat server connections through a multi-source architecture.

## Architecture Overview

Server data flows through three integrated subsystems:

1. **Server Loading and Persistence** (`server_loading_and_persistence.md`)
   - Loads servers from app-bundled configuration (servers.json in app path or `/Library/Preferences/{productName}/servers.json` on macOS)
   - Loads user-stored servers from userData directory, then deletes the source file to prevent duplication
   - Merges sources via `setupServers()` and applies sort order from localStorage
   - Persists via localStorage keys: `rocket.chat.hosts`, `rocket.chat.currentHost`, `rocket.chat.sortOrder`

2. **Server URL Resolution** (`server_url_resolution_system.md`)
   - Normalizes user input via `convertToURL()` (handles both `https://example.com` and `example.com` formats)
   - Validates and resolves URLs via `resolveServerUrl()` with server version checking
   - Enforces minimum server version >=2.0.0 (REQUIRED_SERVER_VERSION_RANGE)
   - Returns status codes: INVALID_URL, TIMEOUT, INVALID, OK

## Key Processing Flow

```
User Input → convertToURL() → resolveServerUrl() → version validation → SERVER_URL_RESOLVED action → servers reducer
```

## Critical Rules

- **URL Normalization**: Remove default ports (80 for http, 443 for https); ensure pathname ends with `/`
- **Server Version**: All servers must meet >=2.0.0 minimum requirement
- **File Cleanup**: User servers.json deleted after loading to prevent duplication
- **Persistence**: Sort order stored separately in localStorage for flexibility
- **Format Support**: Accepts both JSON string and array formats for `rocket.chat.hosts`

## Implementation Location

All server management logic resides in `src/servers/main.ts`