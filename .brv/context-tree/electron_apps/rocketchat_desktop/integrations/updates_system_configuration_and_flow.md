---
title: Updates System Configuration and Flow
tags: []
related: [electron_apps/rocketchat_desktop/configuration/auto_update_system.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:22:24.922Z'
updatedAt: '2026-04-04T18:22:24.922Z'
---
## Raw Concept
**Task:**
Manage application updates with multi-level configuration and platform-specific restrictions

**Changes:**
- Implemented three-level configuration hierarchy: Redux state -> app-level -> user-level
- Implemented platform restrictions for updates (Linux APPIMAGE, Windows non-Store, macOS non-MAS)
- Implemented version comparison with semver to prevent downgrades
- Implemented S3 signed URL expiration checking

**Files:**
- src/updates/main.ts

**Flow:**
setupUpdates() -> load config hierarchy -> listen ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED -> [checking-for-update/update-available/update-not-available/update-downloaded/error] -> dispatch corresponding update actions -> askUpdateInstall() dialog -> quitAndInstall() or warn

**Timestamp:** 2026-04-04

## Narrative
### Structure
Updates system implements configuration hierarchy: Default (Redux state) -> App-level (update.json in app path) -> User-level (update.json in userData). Configuration fields: appConfiguration.forced -> isEachUpdatesSettingConfigurable, appConfiguration.canUpdate -> isUpdatingEnabled, appConfiguration.autoUpdate -> doCheckForUpdatesOnStartup, appConfiguration.skip -> skippedUpdateVersion, appConfiguration.channel -> updateChannel. User config overrides app config only if isEachUpdatesSettingConfigurable is true or app config undefined.

### Dependencies
Depends on electron-updater for autoUpdater, semver for version comparison, Electron app APIs for configuration paths

### Highlights
Platform restrictions: Linux requires APPIMAGE env var, Windows requires non-Store build, macOS requires non-MAS build. Version comparison uses semverGt() to prevent downgrades; comparison failure proceeds with update. Startup check triggers if doCheckForUpdatesOnStartup true. User-initiated check uses 100ms delay. Update dialog offers INSTALL_LATER option with warning.

### Rules
Rule 1: User config overrides app config only if isEachUpdatesSettingConfigurable true or app config undefined
Rule 2: Updates blocked on Linux without APPIMAGE, Windows Store builds, macOS MAS builds
Rule 3: Version comparison failure proceeds with update
Rule 4: Prerelease enabled for alpha/beta channels
