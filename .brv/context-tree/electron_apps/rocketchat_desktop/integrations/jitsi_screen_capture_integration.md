---
title: Jitsi Screen Capture Integration
tags: []
related: [electron_apps/rocketchat_desktop/context.md, electron_apps/rocketchat_desktop/integrations/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:10:57.608Z'
updatedAt: '2026-04-04T18:10:57.608Z'
---
## Raw Concept
**Task:**
Jitsi video conferencing integration enabling screen capture within Jitsi Meet embedded windows with per-server permission management

**Changes:**
- Screen capture permission system with per-server storage
- IPC bridge from renderer to main process for desktop capture
- Redux-persisted permission state across app restarts
- First-time permission dialog with "don't ask again" option

**Files:**
- src/jitsi/actions.ts
- src/jitsi/ipc.ts
- src/jitsi/main.ts
- src/jitsi/preload.ts
- src/jitsi/reducers.ts

**Flow:**
Jitsi window requests capture → preload shim sends IPC → main checks permission store → if first-time shows dialog → persists to Redux → returns sources or empty array

**Timestamp:** 2026-04-04

**Patterns:**
- `jitsi-desktop-capturer-get-sources` - IPC channel name for requesting desktop capture sources from Jitsi
- `JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED` - FSA action type for updating permission for a specific Jitsi server
- `JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED` - FSA action type for clearing all stored Jitsi permissions

## Narrative
### Structure
Architecture spans 5 modules: actions define FSA types, ipc.ts handles main process IPC handler with session-level state (permitted, dontAskAgain, firstAskPermission), main.ts checks Redux store for persisted permissions and shows dialog if needed, preload.ts injects desktopCapturer shim into Jitsi window, reducers.ts manages allowedJitsiServers state store.

### Dependencies
Depends on Electron desktopCapturer API, Redux store for persistence, IPC communication layer, dialog system (askForJitsiCaptureScreenPermission from ui/main/dialogs).

### Highlights
Permission keyed by hostname not full URL. Session-level caching (permitted/dontAskAgain flags) reduces dialog prompts. Redux persistence survives app restarts. First-time permission flow: dialog → user decision → Redux dispatch → future invocations use cached state.

### Rules
Rule 1: Permission stored by hostname extracted from URL. Rule 2: If permitted flag is true, immediately return sources. Rule 3: If dontAskAgain is true, return empty array (deny). Rule 4: On first ask, check Redux store; if server not in store, show dialog. Rule 5: Dialog result with dontAskAgain=true triggers Redux dispatch to persist.

### Examples
Example flow: First visit to jitsi.example.com → shows permission dialog → user clicks "Allow" + "Don't ask again" → JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED dispatched with {jitsiServer: "jitsi.example.com", allowed: true} → Redux persists → next session loads from store → no dialog shown.

## Facts
- **permission_key_type**: Permission is stored by hostname (extracted from URL.host), not full URL [project]
- **session_state_variables**: Session-level state variables: permitted, dontAskAgain, firstAskPermission (reset per-session) [project]
- **persistence_mechanism**: Redux store persists allowedJitsiServers across app restarts via APP_SETTINGS_LOADED [project]
- **jitsi_api_function**: JitsiMeetElectronAPI exports obtainDesktopStreams(callback, errorCallback, options) [project]
- **ipc_channel_name**: IPC channel name for desktop capture requests is "jitsi-desktop-capturer-get-sources" [project]
