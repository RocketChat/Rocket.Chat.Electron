---
title: Downloads System Architecture
tags: []
related: [electron_apps/rocketchat_desktop/integrations/logging_system_architecture.md, electron_apps/rocketchat_desktop/integrations/screen_sharing_ipc_channels.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:17:59.427Z'
updatedAt: '2026-04-04T18:17:59.427Z'
---
## Raw Concept
**Task:**
Implement file download management system spanning main process, reducers, and IPC handlers

**Changes:**
- Downloads tracked via itemId (Date.now())
- S3 presigned URL expiry validation with X-Amz-Date + X-Amz-Expires parameters
- Download preferences persisted via ElectronStore with lastDownloadDirectory tracking
- Download state transitions: progressing -> paused/completed/cancelled/interrupted/expired
- Notifications on download completion and expiry

**Files:**
- src/downloads/main.ts
- src/downloads/main/setup.ts
- src/downloads/reducers/downloads.ts
- src/downloads/common.ts
- src/downloads/actions.ts

**Flow:**
Electron will-download event -> handleWillDownloadEvent() -> Download record creation -> DOWNLOAD_CREATED dispatch -> item event listeners (updated/done) -> IPC handlers for pause/resume/cancel/retry/remove

**Timestamp:** 2026-04-04

## Narrative
### Structure
Downloads system organized into: main.ts (event handling + IPC handlers), main/setup.ts (electron-dl library integration), reducers/downloads.ts (state management), common.ts (types and enums). Downloads keyed by itemId in Redux store as Record<number, Download>.

### Dependencies
Electron session will-download event, electron-dl library, ElectronStore for preferences, Redux dispatch/select, Notifications system via createNotification(), IPC handle() for renderer communication

### Highlights
Core handler handleWillDownloadEvent() creates Download record with: itemId, state, status, fileName, receivedBytes, totalBytes, startTime, url, serverUrl, serverTitle, mimeType, savePath. Supports pause/resume/cancel/retry/remove/clear-all operations. S3 presigned URL expiry checking prevents retry of expired downloads.

### Rules
Rule 1: Download state is tracked via Electron DownloadItem events (updated, done)
Rule 2: itemId is generated from Date.now() at download creation
Rule 3: Save directory preference persists via ElectronStore named "download-preferences"
Rule 4: S3 expired downloads notify user and transition to cancelled state
Rule 5: Downloads in "progressing" or "paused" state are cancelled on app settings load (APP_SETTINGS_LOADED)

### Examples
IPC handler examples: handle("downloads/pause", ...) checks items.has(itemId) then calls item?.pause(). handle("downloads/retry", ...) validates S3 URL expiry via X-Amz-Date and X-Amz-Expires params, notifies if expired, otherwise calls webContents.downloadURL(download.url). handle("downloads/show-in-folder", ...) calls shell.showItemInFolder(download.savePath).
