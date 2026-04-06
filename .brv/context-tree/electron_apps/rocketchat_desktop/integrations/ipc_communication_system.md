---
title: IPC Communication System
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:18:06.061Z'
updatedAt: '2026-04-04T18:18:06.061Z'
---
## Raw Concept
**Task:**
Document the Electron IPC (Inter-Process Communication) layer that enables main and renderer process communication

**Changes:**
- Dual communication patterns: main->renderer (manual request-id protocol) and renderer->main (Electron built-in)
- Added invokeWithRetry for resilient IPC calls with configurable retry strategy
- Type-safe channel system using TypeScript mapped types

**Files:**
- src/ipc/channels.ts
- src/ipc/main.ts
- src/ipc/renderer.ts

**Flow:**
Main process initiates channel -> Renderer listens and handles -> Sends response back via channel@id pattern OR Renderer invokes -> Main handles via ipcMain.handle -> Returns result

## Narrative
### Structure
Three-file architecture: channels.ts defines ChannelToArgsMap type union and Handler<N> mapped type. main.ts exports invoke() and handle() for main process. renderer.ts exports handle(), invoke(), and invokeWithRetry() for renderer process.

### Dependencies
Depends on Electron ipcMain and ipcRenderer APIs. Imports types from downloads, outlookCalendar, servers, and userPresence modules for channel definitions.

### Highlights
Type-safe communication with full TypeScript support. Automatic error serialization/deserialization. Retry mechanism with exponential backoff support. Cleanup functions returned from handlers for proper resource management.
