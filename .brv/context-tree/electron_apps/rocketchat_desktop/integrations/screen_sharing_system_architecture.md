---
title: Screen Sharing System Architecture
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:13:18.149Z'
updatedAt: '2026-04-04T18:13:18.149Z'
---
## Raw Concept
**Task:**
Implement cross-platform screen sharing with provider abstraction and request/response lifecycle management

**Changes:**
- Implemented Flux Standard Action (FSA) request/response pattern for screen sharing requests
- Added provider abstraction supporting both XDG portal (Linux/Wayland) and internal picker UI
- Implemented background cache for desktop capturer sources with stale detection
- Added permission checking for macOS screen recording access

**Files:**
- src/screenSharing/main.ts
- src/screenSharing/serverViewScreenSharing.ts
- src/screenSharing/ScreenSharingRequestTracker.ts
- src/screenSharing/desktopCapturerCache.ts
- src/screenSharing/screenRecordingPermission.ts
- src/screenSharing/screenSharePicker.tsx
- src/screenSharing/screenPicker/types.ts
- src/screenSharing/screenPicker/createScreenPicker.ts
- src/screenSharing/screenPicker/providers/InternalPickerProvider.ts
- src/screenSharing/screenPicker/providers/PortalPickerProvider.ts

**Flow:**
Server webview requests screen share → FSA action dispatched → request tracked → provider picks source → response sent → source validated → callback invoked with selected source

**Timestamp:** 2026-04-04

## Narrative
### Structure
Screen sharing system in src/screenSharing/ consists of: (1) request/response FSA orchestration (main.ts), (2) server view integration (serverViewScreenSharing.ts), (3) request tracking and timeout management (ScreenSharingRequestTracker.ts), (4) background caching of desktop capturer sources (desktopCapturerCache.ts), (5) UI component for source selection (screenSharePicker.tsx), (6) provider abstraction supporting multiple picker implementations (PortalPickerProvider for Linux/Wayland, InternalPickerProvider for other platforms), (7) permission checking (screenRecordingPermission.ts).

### Dependencies
Depends on Electron desktopCapturer API, Electron session.setDisplayMediaRequestHandler, IPC channels for main/renderer communication, Redux store for action dispatch/listen, React + Fuselage for UI components, XDG portal support on Linux systems.

### Highlights
Supports both system picker (XDG portal on Linux/Wayland) and custom internal picker UI. Automatically detects platform and desktop environment to select appropriate provider. Implements request timeout (60 seconds default). Caches desktop capturer sources with stale detection (3 second threshold) and thumbnail validation. Validates selected source before returning to prevent stale source errors.
