---
title: Video Call Window IPC System
tags: []
related: [electron_apps/rocketchat_desktop/integrations/screen_sharing_system_architecture.md, electron_apps/rocketchat_desktop/integrations/ipc_communication_system.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:45:28.662Z'
updatedAt: '2026-04-04T18:45:28.662Z'
---
## Raw Concept
**Task:**
Implement IPC communication for video call window management in Rocket.Chat Desktop

**Changes:**
- Video call window with webview-based video rendering
- IPC channels for window lifecycle and media handling
- Screen picker integration for display media requests
- Windows RDP fallback support for screen capture

**Files:**
- src/videoCallWindow/ipc.ts
- src/public/video-call-window.html

**Flow:**
IPC handler receives open-window -> creates BrowserWindow -> loads HTML -> setup webview -> handle display media -> relay screen picker -> manage lifecycle -> cleanup resources

**Timestamp:** 2026-04-04

## Narrative
### Structure
Video call window system in src/videoCallWindow/ipc.ts manages Electron BrowserWindow creation, IPC communication, webview attachment, and lifecycle. HTML template at src/public/video-call-window.html provides DOM structure with webview container, loading overlay, error overlay, and screen picker root.

### Dependencies
Requires Electron BrowserWindow API, webview tag support, display media handler, screen picker provider, desktop capturer API for screen sharing, media permission handler.

### Highlights
Supports multiple video call providers (Jitsi, Pexip), custom screen picker UI, window bounds persistence, RDP detection for fallback mode, comprehensive lifecycle logging, webview dev tools access.

### Rules
Rule 1: Window creation waits for ongoing destruction to complete
Rule 2: Google URLs (*.g.co) always open externally
Rule 3: SMB protocol is blocked
Rule 4: Display media always uses custom picker (useSystemPicker: false)
Rule 5: Window bounds persistence requires state.isVideoCallWindowPersistenceEnabled flag
Rule 6: Allowed permissions: media, geolocation, notifications, midiSysex, pointerLock, fullscreen, screen-wake-lock, system-wake-lock, openExternal
