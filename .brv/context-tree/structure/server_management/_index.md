---
children_hash: 3b9136b2d2d87f783c34e43567a6e60de7dc8f65d98e97871566cc871627c62f
compression_ratio: 0.5257731958762887
condensation_order: 1
covers: [server_lifecycle_and_loading.md, server_state_and_types.md, server_state_reducer.md, server_url_resolution.md]
covers_token_total: 1649
summary_level: d1
token_count: 867
type: summary
---
# Server Management Architecture

Server management in Rocket.Chat Electron handles multi-source server configuration, state persistence, and URL resolution through a coordinated Redux-based system.

## Core Components

**Server Lifecycle and Loading** (`server_lifecycle_and_loading.md`)
- `setupServers()` initializes server management on app startup, listening for `SERVER_URL_RESOLUTION_REQUESTED` and `WEBVIEW_GIT_COMMIT_HASH_CHECK` actions
- `loadAppServers()` reads admin-configured servers from `servers.json` (platform-specific paths: `/Library/Preferences/{productName}/servers.json` on macOS)
- `loadUserServers()` reads user-configured servers from `userData/servers.json`, deleting file after reading
- Merges app and user configs, applies localStorage sorting via `rocket.chat.sortOrder`, and dispatches `SERVERS_LOADED`
- Fallback support for localStorage `rocket.chat.hosts` (string URL or JSON array) and `rocket.chat.currentHost`
- Git commit hash changes trigger `webContents.session.clearStorageData()` and reload

**Server State and Types** (`server_state_and_types.md`)
- `Server` type (src/servers/common.ts) contains 20+ optional properties with required `url` field
- Core optional fields: `title`, `pageTitle`, `badge`, `favicon`, `style`, `customTheme`, `lastPath`, `failed`, `webContentsId`, `userLoggedIn`, `gitCommitHash`, `version`, `uniqueID`, `isSupportedVersion`, `supportedVersions`, `outlookCredentials`
- `ServerUrlResolutionStatus` enum: `OK`, `INVALID_URL`, `TIMEOUT`, `INVALID`
- `ServerUrlResolutionResult` tuple type: `[url, OK]` for success or `[url, status, error]` for failures

**Server State Reducer** (`server_state_reducer.md`)
- Redux reducer (src/servers/reducers.ts) handles 20+ action types updating server properties
- `upsert()` adds new servers or updates existing by URL (immutable array operations)
- `update()` only modifies existing servers; returns unchanged state if URL not found
- `ensureUrlFormat()` validates URL format or throws error
- Handles webview lifecycle events: `DID_START_LOADING`, `DID_FAIL_LOAD`, `READY`, `ATTACHED`
- Supports version validation (`WEBVIEW_SERVER_IS_SUPPORTED_VERSION`, `WEBVIEW_SERVER_VERSION_UPDATED`), Outlook credentials, and custom themes
- `SIDE_BAR_SERVERS_SORTED` preserves server order via `indexOf()`

**Server URL Resolution** (`server_url_resolution.md`)
- `convertToURL()` normalizes URLs with protocol/port defaults (HTTP: 80, HTTPS: 443, trailing slash on pathname)
- `resolveServerUrl()` validates URLs and fetches server info via IPC
- `fetchServerInformation()` retrieves server version, requiring >=2.0.0
- Subdomain fallback for incomplete URLs via `urls.rocketchat.subdomain()`
- Error handling: `INVALID_URL`, `TIMEOUT` (AbortError), `INVALID`, version mismatch

## Key Rules and Constraints

- `serversMap` deduplicates by URL; servers require both `url` and `title` as strings
- localStorage URLs normalized by removing trailing `/`
- Current server URL validated against `serversMap`
- Empty `serversMap` triggers app + user config loading
- `SERVERS_LOADED` and `APP_SETTINGS_LOADED` ensure URL format validation
- `WEBVIEW_DID_FAIL_LOAD` only sets `failed=true` for mainFrame

## Data Flow

App startup → listen for resolution/hash-check requests → load app/user configs → merge and sort → validate URLs and fetch server info → dispatch `SERVERS_LOADED` → Redux reducer manages state mutations → webview lifecycle events update server properties