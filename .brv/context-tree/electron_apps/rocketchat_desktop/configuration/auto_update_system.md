---
title: Auto-Update System
tags: []
related: [electron_apps/rocketchat_desktop/context.md, electron_apps/rocketchat_desktop/configuration/configuration_files.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:11:08.686Z'
updatedAt: '2026-04-04T18:11:08.686Z'
---
## Raw Concept
**Task:**
Auto-update system architecture for Rocket.Chat Electron with configuration layers, update channels, and platform-specific flows

**Changes:**
- Three-layer configuration system (app-level, user-level, defaults)
- Platform-specific update flows for macOS vs other platforms
- Redux state management for update lifecycle
- Version comparison with semverGt() to prevent downgrades

**Files:**
- src/updates/main.ts
- update.json (app-level config)

**Flow:**
Load config -> check eligibility -> register listeners -> trigger initial check -> event flow: checking-for-update -> update-available -> update-downloaded -> askUpdateInstall -> quitAndInstall

**Timestamp:** 2026-04-04

**Patterns:**
- `^(latest|beta|alpha)$` - Valid update channel names

## Narrative
### Structure
Update system initialized via setupUpdates() in src/updates/main.ts. Configuration merged from three layers with app-level precedence. Redux manages state and actions for update lifecycle.

### Dependencies
Uses electron autoUpdater, semverGt() for version comparison, Redux for state management, platform-specific native updater for macOS

### Highlights
Supports three update channels (latest/beta/alpha). Manual download trigger in production. Platform eligibility checks prevent updates on store/MAS builds. User settings override app settings only if configurable.

### Rules
Rule 1: Updates allowed only on: Linux (APPIMAGE set), Windows (!windowsStore), macOS (!mas)
Rule 2: User settings override app settings only if isEachUpdatesSettingConfigurable=true or app field undefined
Rule 3: macOS must destroy all windows before triggering native updater
Rule 4: Version comparison prevents downgrades when generateUpdatesFilesForAllChannels enabled

### Examples
Update channels: latest=stable, beta=allowPrerelease, alpha=allowPrerelease. Dialog responses: INSTALL_LATER shows warning, install immediately triggers platform-specific flow.

## Facts
- **config_layers**: Three-layer configuration system: app-level, user-level, and defaults from Redux state [project]
- **config_fields**: Configuration fields: forced, canUpdate, autoUpdate, skip, channel [project]
- **update_channels**: Update channels: latest (stable), beta (allowPrerelease=true), alpha (allowPrerelease=true) [project]
- **macos_flow**: macOS update flow: destroy windows -> checkForUpdates -> listen for update-downloaded -> quitAndInstall [project]
- **other_platforms_flow**: Other platforms use autoUpdater.quitAndInstall(true, true) [project]
- **event_flow**: Event flow: checking-for-update -> update-available -> update-downloaded -> askUpdateInstall -> quitAndInstall [project]
- **version_comparison**: Version comparison uses semverGt() to ignore older updates and prevent downgrades [project]
- **redux_actions**: Redux actions include UPDATES_CHECK_FOR_UPDATES_REQUESTED, UPDATE_SKIPPED, UPDATES_READY, UPDATES_ERROR_THROWN, UPDATES_CHANNEL_CHANGED [project]
- **redux_state**: Redux state fields: isCheckingForUpdates, isUpdatingEnabled, isUpdatingAllowed, isEachUpdatesSettingConfigurable, doCheckForUpdatesOnStartup, newUpdateVersion, skippedUpdateVersion, updateChannel, updateError [project]
- **setup_updates_function**: setupUpdates() in src/updates/main.ts initializes the update system with 7 steps [project]
- **platform_eligibility**: Platform eligibility: Linux requires process.env.APPIMAGE, Windows !process.windowsStore, macOS !process.mas [project]
- **dev_mode_config**: Development mode sets app.isPackaged = true and configures autoUpdater.updateConfigPath [project]
- **prod_mode_config**: Production mode sets autoUpdater.autoDownload = false for manual download trigger [project]
- **install_dialog**: askUpdateInstall() dialog returns INSTALL_LATER or install immediately, with warning dialog on defer [project]
- **error_dispatch**: Errors dispatched as UPDATES_ERROR_THROWN with payload {message, stack, name} [project]
