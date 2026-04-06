---
title: Server Loading and Persistence
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:31:19.342Z'
updatedAt: '2026-04-04T18:31:19.342Z'
---
## Raw Concept
**Task:**
Load and persist server list from app and user configuration

**Changes:**
- Added loadAppServers() to read app-bundled servers
- Added loadUserServers() to read user-stored servers
- Added setupServers() to merge and apply sort order
- Added localStorage-based persistence

**Files:**
- src/servers/main.ts

**Flow:**
loadAppServers() + loadUserServers() → setupServers() → apply localStorage sort → SERVERS_LOADED action

**Timestamp:** 2026-04-04

## Narrative
### Structure
Server persistence uses three sources: app-bundled servers (servers.json in app path), user servers (servers.json in userData, deleted after load), and localStorage sort order. setupServers() merges sources and applies sort order from localStorage.

### Dependencies
Reads from app path or /Library/Preferences/{productName}/servers.json (macOS). Reads from userData directory. Uses localStorage keys for persistence.

### Highlights
User servers file is deleted after loading to prevent duplication. Sort order is stored separately in localStorage for flexibility. Supports both JSON string and array formats for rocket.chat.hosts.

### Rules
Rule 1: loadAppServers() reads from app path or macOS preferences directory
Rule 2: loadUserServers() deletes servers.json after reading
Rule 3: setupServers() merges app + user servers
Rule 4: localStorage keys: rocket.chat.hosts, rocket.chat.currentHost, rocket.chat.sortOrder
