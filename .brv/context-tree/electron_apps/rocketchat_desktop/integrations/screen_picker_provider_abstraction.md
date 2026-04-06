---
title: Screen Picker Provider Abstraction
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:13:18.152Z'
updatedAt: '2026-04-04T18:13:18.152Z'
---
## Raw Concept
**Task:**
Abstract screen picker implementation with platform-specific providers (XDG portal vs internal UI)

**Changes:**
- Implemented ScreenPickerProvider interface with type, requiresInternalUI, requiresCacheWarming properties
- Created PortalPickerProvider for Linux/Wayland using XDG portal
- Created InternalPickerProvider for custom React-based picker UI
- Implemented detectPickerType() to select provider based on platform and desktop environment

**Files:**
- src/screenSharing/screenPicker/types.ts
- src/screenSharing/screenPicker/createScreenPicker.ts
- src/screenSharing/screenPicker/providers/PortalPickerProvider.ts
- src/screenSharing/screenPicker/providers/InternalPickerProvider.ts

**Flow:**
detectPickerType() checks platform and desktop env → returns 'portal' or 'internal' → instantiate appropriate provider → provider.handleDisplayMediaRequest(callback) → on selection: find source from desktopCapturer → invoke callback with selected source

**Timestamp:** 2026-04-04

## Narrative
### Structure
ScreenPickerProvider interface (screenPicker/types.ts) defines: type ('portal' | 'internal'), requiresInternalUI (boolean), requiresCacheWarming (boolean), handleDisplayMediaRequest(callback), initialize(), cleanup(). PortalPickerProvider: type='portal', used on Linux with Wayland session OR desktop env in [GNOME, KDE, XFCE, Cinnamon, MATE, Pantheon, Budgie, Unity], calls desktopCapturer.getSources() which triggers OS portal picker, no init/cleanup needed. InternalPickerProvider: type='internal', requires React UI component and cache warming, handler set by ipc.ts, initialize set by renderer. detectPickerType() in createScreenPicker.ts determines provider: if Linux AND (Wayland OR desktop env matches) → 'portal', else → 'internal'. Singleton pattern via cachedProvider.

### Dependencies
Requires ScreenPickerProvider interface implementation, Electron desktopCapturer API, React UI component for internal picker, XDG portal support on Linux systems, desktop environment detection.

### Highlights
Abstracts platform-specific picker implementations behind common interface. XDG portal on Linux/Wayland delegates to system picker (no custom UI needed). Internal picker on other platforms provides custom React-based UI. Automatic platform detection selects appropriate provider. Singleton pattern ensures only one provider instance. Cache warming optional based on provider type.
