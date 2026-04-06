---
title: Rocket.Chat.Electron Documentation
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:06:37.622Z'
updatedAt: '2026-04-04T18:06:37.622Z'
---
## Raw Concept
**Task:**
Document Rocket.Chat.Electron desktop application - official Electron-based client wrapping Rocket.Chat web app

**Changes:**
- TypeScript 5 rewrite for maintainability
- React 18 and Redux 5 integration
- Rollup 4 build pipeline
- Electron 40 framework

**Files:**
- src/main.ts
- src/rootWindow.ts
- src/preload.ts
- package.json

**Flow:**
User launches app -> connects to Rocket.Chat server -> native features enabled (notifications, screen sharing, deep links, spell check, auto-updates, Jitsi, Outlook sync)

**Timestamp:** 2026-04-04

**Patterns:**
- `(src/main\.ts|src/rootWindow\.ts|src/preload\.ts)` - Entry points for Electron main process, root window UI, and preload scripts
- `\*\.(spec|test)\.(js|ts|tsx)` - Jest test file pattern for unit tests

## Narrative
### Structure
Three-tier architecture: main.ts (Electron orchestration) -> rootWindow.ts (UI rendering) -> preload.ts (privileged bridge). Build pipeline uses Rollup to compile src/ to app/ folder. Supports Windows 10+, macOS 12+ (Universal), Linux Ubuntu 22.04+ (x64).

### Dependencies
Node.js >= 24.11.1, Yarn >= 4.0.2, Git. Development requires build-essential and libxss-dev on Ubuntu/Debian, libX11-devel and libXScrnSaver-devel on Fedora/RHEL.

### Highlights
Multi-platform native desktop features including notifications, screen sharing, deep links, spell checking, auto-updates, Jitsi integration, Outlook calendar sync, multi-server management. Available on Microsoft Store, Mac App Store, Snap Store.

### Rules
Rule 1: Only dependencies (not devDependencies) are included in distributable app
Rule 2: servers.json is only checked if no servers already exist
Rule 3: overridden-settings.json in user preferences folder overrides default and user settings
Rule 4: Single server mode enabled by setting "isAddNewServersEnabled": false

### Examples
Windows silent install: installer.exe /S /allusers /disableAutoUpdates. servers.json example: {"Demo Rocket Chat": "https://demo.rocket.chat", "Open Rocket Chat": "https://open.rocket.chat"}. overridden-settings.json example: {"isTrayIconEnabled": false, "isMinimizeOnCloseEnabled": false}
