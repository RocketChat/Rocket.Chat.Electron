---
title: Screen Sharing IPC Channels
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:13:18.153Z'
updatedAt: '2026-04-04T18:13:18.153Z'
---
## Raw Concept
**Task:**
Document IPC channels used for screen sharing communication between main and renderer processes

**Changes:**
- Documented screen-picker/open channel for opening picker UI
- Documented screen-picker/source-responded channel for response handling
- Documented screen-picker/screen-recording-is-permission-granted channel for permission checking
- Documented screen-picker/open-url channel for opening external URLs
- Documented desktop-capturer-get-sources channel for source retrieval

**Files:**
- src/screenSharing/main.ts
- src/screenSharing/serverViewScreenSharing.ts
- src/screenSharing/ScreenSharingRequestTracker.ts
- src/screenSharing/desktopCapturerCache.ts

**Flow:**
Main process → renderer: screen-picker/open, screen-picker/screen-recording-is-permission-granted, screen-picker/open-url. Renderer → main: screen-picker/source-responded, desktop-capturer-get-sources.

**Timestamp:** 2026-04-04

## Narrative
### Structure
IPC channels used in screen sharing: (1) 'screen-picker/open' - main sends to renderer to open picker UI, (2) 'screen-picker/source-responded' - renderer responds with selected sourceId or null, (3) 'screen-picker/screen-recording-is-permission-granted' - renderer queries main for permission status (async), (4) 'screen-picker/open-url' - renderer requests main to open external URL with protocol validation, (5) 'desktop-capturer-get-sources' - renderer requests main for cached desktop capturer sources with cache-first strategy.

### Dependencies
Requires IPC handler registration via handle() function, ScreenSharingRequestTracker for request/response correlation, desktopCapturerCache for source caching.

### Highlights
screen-picker/open uses webContents.send() for one-way notification. screen-picker/source-responded uses ipcMain.once() for single response. screen-picker/screen-recording-is-permission-granted is async handler for permission check. screen-picker/open-url validates protocol before opening external URL. desktop-capturer-get-sources implements cache-first strategy with stale detection.
