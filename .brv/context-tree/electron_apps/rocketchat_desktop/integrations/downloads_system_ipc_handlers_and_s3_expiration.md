---
title: Downloads System IPC Handlers and S3 Expiration
tags: []
related: [electron_apps/rocketchat_desktop/integrations/downloads_system_architecture.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:22:24.926Z'
updatedAt: '2026-04-04T18:22:24.926Z'
---
## Raw Concept
**Task:**
Manage file downloads with IPC handlers, S3 signed URL expiration checking, and state tracking

**Changes:**
- Implemented download item tracking via items Map keyed by itemId (timestamp)
- Implemented S3 signed URL expiration validation
- Implemented download retry with expiration checking
- Implemented download state tracking with DOWNLOAD_CREATED, DOWNLOAD_UPDATED, DOWNLOAD_REMOVED events

**Files:**
- src/downloads/main.ts

**Flow:**
handleWillDownloadEvent() -> create download payload -> dispatch DOWNLOAD_CREATED -> attach listeners -> item updated -> dispatch DOWNLOAD_UPDATED -> item done -> dispatch DOWNLOAD_UPDATED (final) -> remove from items map

**Timestamp:** 2026-04-04

**Patterns:**
- `^\d{8}T\d{6}Z$` - S3 X-Amz-Date format: YYYYMMDDTHHmmssZ

## Narrative
### Structure
Downloads system in src/downloads/main.ts tracks downloads via items Map keyed by itemId (timestamp). Download payload includes: itemId, state, status, fileName, receivedBytes, totalBytes, startTime, endTime, url, serverUrl, serverTitle, mimeType, savePath. IPC handlers via handle(): downloads/show-in-folder, downloads/copy-link, downloads/pause, downloads/resume, downloads/cancel, downloads/retry, downloads/clear-all, downloads/remove.

### Dependencies
Depends on Electron session.on(will-download) for download events, electron-dl for download functionality, electron-store for persistence, shell API for folder navigation, clipboard API for link copying

### Highlights
S3 expiration check parses X-Amz-Date (YYYYMMDDTHHmmssZ format) and X-Amz-Expires (seconds), compares current time against expiration timestamp. If expired, notifies and marks cancelled; else removes and triggers webContentsInstance.downloadURL(). Download lifecycle: handleWillDownloadEvent creates payload and dispatches DOWNLOAD_CREATED, item updated dispatches DOWNLOAD_UPDATED, item done dispatches final DOWNLOAD_UPDATED and removes from map.

### Rules
Rule 1: S3 signed URLs checked for expiration via X-Amz-Date + X-Amz-Expires
Rule 2: Expired downloads notify user and mark cancelled
Rule 3: Download state tracked by itemId (timestamp)
Rule 4: Final download state transitions remove item from items map
