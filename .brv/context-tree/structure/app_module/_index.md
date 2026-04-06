---
children_hash: 88464745041dda5b99464560bfabc1f61a5f0ff8d85ffbf147f98cc892743fab
compression_ratio: 0.5184940554821664
condensation_order: 1
covers: [app_actions_and_state_selectors.md, app_module_bootstrap.md, context.md]
covers_token_total: 1514
summary_level: d1
token_count: 785
type: summary
---
# App Module: Bootstrap, Redux State, and Settings Management

## Overview
The app module (src/app/) provides core Redux infrastructure, application bootstrap logic, and persistent settings management for the Rocket.Chat Electron desktop client. It handles Electron lifecycle events, platform-specific initialization, and cross-cutting configuration concerns.

## Core Components

### Redux Foundation
- **Actions** (src/app/actions.ts): FSA-compliant action type constants following `APP_[A-Z_]+` naming convention
- **Selectors** (src/app/selectors.ts): 41+ memoized state selectors via reselect's createStructuredSelector
- **State Type** (src/app/PersistableValues.ts): Type definition for disk-persisted application state
- **AppActionTypeToPayloadMap**: Type-safe action-to-payload mapping for all app actions

### Key Actions
APP_SETTINGS_LOADED (universal hydration on startup), APP_ERROR_THROWN, APP_PATH_SET, APP_VERSION_SET, APP_MACHINE_THEME_SET, APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET, APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET, APP_MAIN_WINDOW_TITLE_SET

### State Coverage
UI preferences (theme, window state, sidebar), feature flags (updates, developer mode, Jitsi), security settings (NTLM credentials, certificates), application metadata (version, window title)

## Bootstrap Flow
**performElectronStartup()** → **setupApp()** → **setupGpuCrashHandler()** (Linux) → **initializeScreenCaptureFallbackState()**

Main bootstrap logic in src/app/main/app.ts coordinates Electron lifecycle, protocol registration, and platform-specific initialization.

## Platform-Specific Handling

### Windows RDP Detection
- Detected via SESSIONNAME environment variable (RDP = sessionName ≠ 'Console')
- Forces screen capture fallback when RDP session detected
- Skips GPU crash handler relaunch on RDP (already disabled)

### Linux GPU Crashes
- GPU crash handler (Linux only) relaunches with --disable-gpu --ozone-platform=x11
- Prevents repeated crashes from hardware acceleration failures

### Linux Wayland Support
- Wayland detection uses XDG_SESSION_TYPE and WAYLAND_DISPLAY environment variables
- Validates Wayland socket existence at ${XDG_RUNTIME_DIR}/${WAYLAND_DISPLAY} before forcing X11

### AppImage Relaunch
- Uses spawn(process.env.APPIMAGE, args) followed by app.exit()
- Custom approach required for AppImage self-restart

## Settings Management

### OverrideOnlySettings
Admin-only configuration loaded from overridden-settings.json. Applied only when isNTLMCredentialsEnabled && allowedNTLMCredentialsDomains.length > 0.

### Naming Conventions
- Action types: `APP_[A-Z_]+` prefix
- Boolean feature flags: `is*Enabled` pattern (e.g., isMenuBarEnabled, isTrayIconEnabled)
- Settings extend Partial<PersistableValues> for type safety

## Dependencies
- Electron app lifecycle and environment variables
- Redux store and RootState
- reselect library for selector memoization
- Platform detection via environment variables

## Related Entries
See **app_actions_and_state_selectors.md** for detailed action and selector documentation; **app_module_bootstrap.md** for bootstrap sequence and platform-specific logic details.