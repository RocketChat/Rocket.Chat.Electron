---
title: Rocket.Chat.Electron Overview
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:05:46.422Z'
updatedAt: '2026-04-04T18:05:46.422Z'
---
## Raw Concept
**Task:**
Electron-based desktop client for Rocket.Chat providing native desktop features

**Changes:**
- Rewritten in TypeScript 5 for maintainability
- Uses React 18, Redux 5, Rollup 4, Electron 40
- Supports Windows 10+, macOS 12+, Linux Ubuntu 22.04+

**Files:**
- src/main.ts
- src/rootWindow.ts
- src/preload.ts
- package.json

**Flow:**
Electron main process -> Root window renderer -> Preload bridge -> Rocket.Chat web client

**Timestamp:** 2026-04-04

## Narrative
### Structure
Electron desktop application wrapping Rocket.Chat web app. Main entry points: src/main.ts (main process), src/rootWindow.ts (UI renderer), src/preload.ts (privileged bridge). Build process uses Rollup bundler with three entry files.

### Dependencies
Requires Node.js >= 24.11.1, Yarn >= 4.0.2, Git. Development dependencies: Jest with electron runner, TypeScript 5, Rollup 4. Runtime: Electron 40, React 18, Redux 5.

### Highlights
Native desktop features: notifications, screen sharing, deep links, spell checking, auto-updates, Jitsi integration, Outlook calendar sync, multi-server management. Cross-platform: Windows (NSIS/MSI), macOS (DMG/PKG/ZIP), Linux (AppImage/deb/rpm/snap/tar.gz). Configurable via servers.json and overridden-settings.json.

### Rules
Rule 1: Only modules in dependencies (not devDependencies) are included in distributable app
Rule 2: servers.json is only checked if no other servers have already been added
Rule 3: overridden-settings.json overrides both default and user settings
Rule 4: Windows silent install requires /S flag
Rule 5: Single server mode requires isAddNewServersEnabled: false in settings

## Facts
- **windows_support**: Windows 10 minimum version with x64, ia32, arm64 architectures [project]
- **macos_support**: macOS 12 (Monterey) minimum version with Universal (x64 + Apple Silicon) architecture [project]
- **linux_support**: Linux Ubuntu 22.04+ or equivalent with x64 architecture [project]
- **windows_formats**: Windows installer formats: NSIS, MSI [project]
- **macos_formats**: macOS installer formats: DMG, PKG, ZIP [project]
- **linux_formats**: Linux installer formats: AppImage, deb, rpm, snap, tar.gz [project]
- **typescript_version**: Built with TypeScript 5 [project]
- **react_version**: Built with React 18 [project]
- **redux_version**: Built with Redux 5 [project]
- **rollup_version**: Built with Rollup 4 bundler [project]
- **electron_version**: Built with Electron 40 [project]
- **test_framework**: Uses Jest testing framework with Jest electron runner [project]
- **build_tool**: Packaging handled by electron-builder [project]
- **nodejs_version**: Node.js >= 24.11.1 required for development [convention]
- **yarn_version**: Yarn >= 4.0.2 required for development [convention]
- **git_required**: Git required for development [convention]
- **entry_files**: Three entry files for build: src/main.ts (main process), src/rootWindow.ts (UI), src/preload.ts (privileged mode) [convention]
- **build_structure**: Source code located in src folder, built output in app folder [convention]
- **test_pattern**: Test files match glob pattern *.(spec|test).{js,ts,tsx} [convention]
- **desktop_features**: Provides native desktop features: notifications, screen sharing, deep links, spell checking, auto-updates [project]
- **jitsi_integration**: Supports Jitsi integration [project]
- **outlook_sync**: Supports Outlook calendar sync [project]
- **multi_server**: Supports multi-server management [project]
- **servers_config**: servers.json defines default servers on first run [project]
- **settings_override**: overridden-settings.json allows user preference folder configuration [project]
- **windows_flags**: Windows installer supports /S (silent), /allusers, /currentuser, /disableAutoUpdates flags [project]
