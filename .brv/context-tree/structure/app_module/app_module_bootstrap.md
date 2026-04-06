---
title: App Module Bootstrap
tags: []
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:18:18.675Z'
updatedAt: '2026-04-04T18:20:58.270Z'
---
## Raw Concept
**Task:**
Application bootstrap, Redux state foundation, and cross-cutting settings management

**Files:**
- src/app/actions.ts
- src/app/selectors.ts
- src/app/PersistableValues.ts
- src/app/main/app.ts
- src/app/main/data.ts
- src/app/main/persistence.ts

**Flow:**
performElectronStartup() -> setupApp() -> setupGpuCrashHandler() (Linux) -> initializeScreenCaptureFallbackState()

**Timestamp:** 2026-04-04

## Narrative
### Structure
App module in src/app/ provides core FSA action types (actions.ts), Redux selectors (selectors.ts), and PersistableValues type for disk-persisted state. Main bootstrap logic in src/app/main/app.ts handles Electron lifecycle, protocol registration, and platform-specific initialization.

### Dependencies
Depends on Electron app lifecycle, Redux store, and platform-specific environment variables (SESSIONNAME for Windows RDP, XDG_SESSION_TYPE/WAYLAND_DISPLAY for Linux Wayland detection)

### Highlights
APP_SETTINGS_LOADED is universal settings hydration action on startup. OverrideOnlySettings carry admin-only settings from overridden-settings.json. Windows RDP detection forces screen capture fallback. Linux GPU crash handler relaunches with --disable-gpu. AppImage relaunch uses custom spawn() approach.

### Rules
Rule 1: window-all-closed event includes 100ms delay before checking if windows remain
Rule 2: NTLM credentials applied only if isNTLMCredentialsEnabled && allowedNTLMCredentialsDomains.length > 0
Rule 3: Screen capture fallback relaunch skipped on RDP (already disabled)
Rule 4: Wayland socket validation at ${XDG_RUNTIME_DIR}/${WAYLAND_DISPLAY} before forcing X11

### Examples
Example: Windows RDP detection via SESSIONNAME !== "Console". Example: Linux Wayland validation checks socket existence. Example: GPU crash triggers relaunch with --disable-gpu --ozone-platform=x11.

## Facts
- **app_module_path**: App module is located in src/app/ [project]
- **app_settings_loaded**: APP_SETTINGS_LOADED is the universal settings hydration action dispatched on startup [project]
- **override_only_settings**: OverrideOnlySettings carry admin-only settings from overridden-settings.json [project]
- **windows_rdp_detection**: Windows RDP sessions detected via SESSIONNAME environment variable (RDP = sessionName !== 'Console') [project]
- **linux_wayland_detection**: Linux Wayland detection uses XDG_SESSION_TYPE and WAYLAND_DISPLAY environment variables [project]
- **appimage_relaunch**: AppImage relaunch uses spawn(process.env.APPIMAGE, args) then app.exit() [project]
- **gpu_crash_handler**: GPU crash handler (Linux only) relaunches with --disable-gpu on GPU process crash [project]
- **screen_capture_rdp**: Screen capture fallback is forced on RDP sessions [project]
