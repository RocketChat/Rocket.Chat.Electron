---
title: Server Lifecycle and Loading
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:16:26.071Z'
updatedAt: '2026-04-04T18:16:26.071Z'
---
## Raw Concept
**Task:**
Handle server loading from multiple sources and initialization

**Changes:**
- loadAppServers() reads admin-configured servers from servers.json
- loadUserServers() reads user-configured servers from userData/servers.json
- setupServers() merges sources and dispatches SERVERS_LOADED
- Supports localStorage fallbacks for rocket.chat.hosts and rocket.chat.currentHost

**Files:**
- src/servers/main.ts

**Flow:**
App startup -> listen(SERVER_URL_RESOLUTION_REQUESTED) + listen(WEBVIEW_GIT_COMMIT_HASH_CHECK) -> select servers -> merge app/user config -> apply sorting -> dispatch SERVERS_LOADED

**Timestamp:** 2026-04-04

## Narrative
### Structure
setupServers() initializes server management lifecycle. On macOS, loadAppServers() checks /Library/Preferences/{productName}/servers.json before app directory. loadUserServers() reads from app.getPath("userData") and deletes file after reading. Both return empty object on error.

### Dependencies
Requires APP_SETTINGS_LOADED action. Listens for SERVER_URL_RESOLUTION_REQUESTED and WEBVIEW_GIT_COMMIT_HASH_CHECK actions. Uses select() to access current servers and currentView from Redux store.

### Highlights
localStorage["rocket.chat.hosts"] can be string URL or JSON array of URLs. localStorage["rocket.chat.sortOrder"] applies custom sort order via indexOf(). Git commit hash changes trigger webContents.session.clearStorageData() and reload.

### Rules
Rule 1: serversMap deduplicates by URL
Rule 2: Servers must have both url and title as strings
Rule 3: localStorage URLs are normalized by removing trailing /
Rule 4: Current server URL is validated against serversMap
Rule 5: Empty serversMap triggers app + user config loading
