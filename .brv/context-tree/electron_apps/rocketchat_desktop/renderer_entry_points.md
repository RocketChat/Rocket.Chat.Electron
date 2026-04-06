---
title: Renderer Entry Points
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:09:38.408Z'
updatedAt: '2026-04-04T18:09:38.408Z'
---
## Raw Concept
**Task:**
Document renderer initialization entry points for Rocket.Chat Desktop

**Files:**
- src/rootWindow.ts
- src/preload.ts
- src/injected.ts

**Flow:**
rootWindow creates store -> preload bridges APIs -> injected integrates with Rocket.Chat web app

**Timestamp:** 2026-04-04

## Narrative
### Structure
Three main renderer entry points: rootWindow.ts (root BrowserWindow), preload.ts (webview preload context), injected.ts (Rocket.Chat web app iframe injection). Each handles initialization, API exposure, and reactive features.

### Dependencies
rootWindow depends on Redux store, error handling, i18n. preload depends on IPC communication with main process. injected depends on Meteor modules and server version.

### Highlights
rootWindow mounts React App to #root container. preload exposes window.RocketChatDesktop and window.JitsiMeetElectron APIs. injected implements 11+ reactive features including favicon, badge, title, user login, presence detection, and Outlook calendar integration. Custom RocketChatDesktopNotification class with platform-specific maxActions (Number.MAX_SAFE_INTEGER on macOS, 0 elsewhere).

### Rules
Rule 1: preload uses max 5 retries with 1s delay for server-view/get-url
Rule 2: injected uses exponential backoff (max 30s total, 1s initial, 1.5x multiplier, 5s cap) for window.require
Rule 3: Reactive features use Tracker.autorun with setup flags to prevent duplicates
Rule 4: WEBVIEW_DID_NAVIGATE listener has 30s debounce
Rule 5: Cache clears when image resources exceed 50MB
Rule 6: Module loading polled every 1s to detect newly loaded modules
Rule 7: Version comparison strips pre-release suffixes (e.g., -develop, -rc)

### Examples
rootWindow initialization: createRendererReduxStore() → whenReady() → setupRendererErrorHandling() → setupI18n() → lazy-import modules → createRoot() → mount. preload startup: window load/DOMContentLoaded → invoke server-view/get-url → setServerUrl → createRendererReduxStore → invoke server-view/ready → onReady callback. Jitsi override: window.open() intercepted for Jitsi domains when getInternalVideoChatWindowEnabled() is true and not on MAS.
