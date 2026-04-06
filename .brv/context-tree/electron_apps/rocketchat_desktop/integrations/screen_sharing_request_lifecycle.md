---
title: Screen Sharing Request Lifecycle
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:13:18.150Z'
updatedAt: '2026-04-04T18:13:18.150Z'
---
## Raw Concept
**Task:**
Manage screen sharing request/response lifecycle using FSA pattern with timeout and validation

**Changes:**
- Implemented ScreenSharingRequestTracker for one-at-a-time request management
- Added 60-second timeout for screen sharing requests
- Implemented request ID tracking to prevent race conditions
- Added source validation before returning to callback

**Files:**
- src/screenSharing/main.ts
- src/screenSharing/ScreenSharingRequestTracker.ts

**Flow:**
WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED (with meta.id) → listen for response → WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED or SCREEN_SHARING_DIALOG_DISMISSED → dispatch response with matching meta.id → ScreenSharingRequestTracker.createRequest() → wait for ipcMain response or timeout → validate source from desktopCapturer.getSources() → invoke callback with {video: source} or {video: false}

**Timestamp:** 2026-04-04

## Narrative
### Structure
Request lifecycle managed by: (1) main.ts setupScreenSharing() listens to WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED action with meta.id, (2) waits for either WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED or SCREEN_SHARING_DIALOG_DISMISSED action with matching meta.id, (3) dispatches response action, (4) ScreenSharingRequestTracker.createRequest() receives DisplayMediaCallback and sendOpenPicker function, (5) generates unique requestId, (6) sets up ipcMain.once() listener on responseChannel, (7) sets 60-second timeout, (8) calls sendOpenPicker() to trigger UI, (9) on response: retrieves sources from desktopCapturer.getSources(), finds matching source by ID, validates it exists, calls callback with {video: source}, (10) on timeout: calls callback with {video: false}.

### Dependencies
Requires Redux store with dispatch/listen methods, FSA request/response pattern with meta.id tracking, Electron ipcMain for IPC communication, desktopCapturer API for source validation, request tracking to prevent concurrent requests.

### Highlights
Only one screen sharing request allowed at a time (isPending flag). Request ID prevents race conditions between multiple responses. Timeout prevents indefinite waiting if user dismisses picker. Source validation ensures selected source still exists (prevents stale source errors). Callback invoked only once (callbackInvoked flag prevents double invocation).
