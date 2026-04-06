---
children_hash: 0836e9e809de115995f9893f46544a9976b5507e864527d1460d5f275729350d
compression_ratio: 0.5134228187919463
condensation_order: 0
covers: [auto_update_system.md, configuration_files.md]
covers_token_total: 1490
summary_level: d0
token_count: 765
type: summary
---
# Rocket.Chat Electron Configuration System

## Overview
The configuration system comprises two primary subsystems: **auto-update management** and **server/settings configuration**. Both use layered, platform-aware approaches with Redux state management for updates and JSON-based configuration files for servers and settings overrides.

## Auto-Update System

**Architecture:** Three-layer configuration (app-level, user-level, defaults) with Redux state management and platform-specific update flows.

**Update Channels:** `latest` (stable), `beta` (allowPrerelease), `alpha` (allowPrerelease)

**Configuration Fields:** forced, canUpdate, autoUpdate, skip, channel

**Event Flow:** checking-for-update → update-available → update-downloaded → askUpdateInstall → quitAndInstall

**Platform-Specific Flows:**
- **macOS:** Destroy all windows → checkForUpdates → listen for update-downloaded → quitAndInstall (native updater)
- **Other platforms:** autoUpdater.quitAndInstall(true, true)

**Platform Eligibility Rules:**
- Linux: Requires `process.env.APPIMAGE`
- Windows: Blocked on `process.windowsStore`
- macOS: Blocked on `process.mas`

**Configuration Precedence:** App-level > user-level > defaults. User settings override app settings only if `isEachUpdatesSettingConfigurable=true` or app field undefined.

**Key Safeguards:**
- Version comparison via semverGt() prevents downgrades
- Production mode sets `autoDownload=false` for manual trigger
- Development mode configures `autoUpdater.updateConfigPath`

**Redux State Fields:** isCheckingForUpdates, isUpdatingEnabled, isUpdatingAllowed, isEachUpdatesSettingConfigurable, doCheckForUpdatesOnStartup, newUpdateVersion, skippedUpdateVersion, updateChannel, updateError

**Implementation:** setupUpdates() in src/updates/main.ts (7-step initialization)

See **auto_update_system.md** for detailed event handling and error dispatch patterns.

## Server & Settings Configuration

**Configuration Files:**
- **servers.json:** Server list (JSON object with server name keys and URL values)
- **overridden-settings.json:** Settings overrides for admin-level configuration

**Load Timing:** servers.json checked only on first app launch or when all servers removed; overridden-settings.json applied at startup.

**Configuration Precedence:** overridden-settings.json > user settings > defaults

**Platform-Specific Paths:**
- **Windows:** %APPDATA%/Rocket.Chat/ or Program Files/Rocket.Chat/Resources/
- **macOS:** ~/Library/Application Support/Rocket.Chat/ or /Library/Preferences/Rocket.Chat/
- **Linux:** ~/.config/Rocket.Chat/ or /opt/Rocket.Chat/resources/

**Key Capabilities:**
- Disable auto-update feature
- Enable single server mode (isAddNewServersEnabled: false)
- Customize tray behavior
- Post-install configuration via user preferences folder

**Configuration Rules:**
- Post-install servers.json overwrites bundled version
- Settings in overridden-settings.json take precedence over all other sources

See **configuration_files.md** for file format specifications and platform path details.