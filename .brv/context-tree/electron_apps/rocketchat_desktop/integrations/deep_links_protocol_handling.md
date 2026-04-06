---
title: Deep Links Protocol Handling
tags: []
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:23:55.520Z'
updatedAt: '2026-04-04T18:31:19.345Z'
---
## Raw Concept
**Task:**
Parse and route deep links for authentication, room navigation, invites, and conferences

**Changes:**
- Added parseDeepLink() parser for custom protocol and go URL shortener
- Added support for auth, room, invite, conference actions
- Added performOnServer() for server lookup and action execution
- Added setupDeepLinks() for app.open-url and app.second-instance listeners

**Files:**
- src/deepLinks/main.ts

**Flow:**
Deep link arrives → parseDeepLink() → performOnServer() → resolve/add server → dispatch DEEP_LINKS_SERVER_FOCUSED/ADDED → execute action via IPC

**Timestamp:** 2026-04-04

**Patterns:**
- `^protocol://action\?args$` - Deep link URL format
- `^\/?(direct|group|channel|livechat)\/[0-9a-zA-Z-_.]+` - Room path validation
- `^invite\/` - Invite path prefix
- `^conference\/` - Conference path prefix

## Narrative
### Structure
Deep link handling in src/deepLinks/main.ts supports custom protocol ({electronBuilderJsonInformation.protocol}://) and go URL shortener (https://{packageJsonInformation.goUrlShortener}/).

### Dependencies
Listens to app.open-url (macOS) and app.second-instance (Windows/Linux). Resolves server URL and polls getWebContentsByServerUrl() every 100ms until available. Asks user permission if server missing.

### Highlights
Supports four actions: auth (loads home with resumeToken), room (validates path and loads URL), invite (validates path), conference (validates path). Handles missing servers by prompting user and adding server if permitted.

### Rules
Rule 1: parseDeepLink() skips CLI flags (starts with --)
Rule 2: Room path must match /^\/?(direct|group|channel|livechat)\/[0-9a-zA-Z-_.]+/
Rule 3: Invite path must match /^invite\//
Rule 4: Conference path must match /^conference\//
Rule 5: performOnServer() polls every 100ms until webContents available
