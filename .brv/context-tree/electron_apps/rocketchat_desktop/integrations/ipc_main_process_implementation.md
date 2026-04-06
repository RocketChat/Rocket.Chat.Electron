---
title: IPC Main Process Implementation
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:18:06.063Z'
updatedAt: '2026-04-04T18:18:06.063Z'
---
## Raw Concept
**Task:**
Implement main process IPC handlers and invocation logic

**Files:**
- src/ipc/main.ts

**Flow:**
Main process calls invoke(webContents, channel, ...args) -> Generates random hex id -> Sends via webContents.send(channel, id, ...args) -> Listens for response on channel@id -> Resolves/rejects Promise with result or serialized Error

## Narrative
### Structure
Two exports: invoke() for sending to renderer and handle() for receiving from renderer. The invoke() function uses a request-id pattern with ipcMain.once() listeners. The handle() function wraps ipcMain.handle() and passes event.sender (WebContents) as the first argument to handlers.

### Highlights
Error serialization: errors are reconstructed with name, message, and stack properties. Cleanup function returned from handle() calls ipcMain.removeHandler() for proper resource cleanup. Type-safe with full TypeScript generics support.
