---
title: Video Call Window IPC Channels
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:45:28.663Z'
updatedAt: '2026-04-04T18:45:28.663Z'
---
## Raw Concept
**Task:**
Document all IPC channels for video call window communication

**Changes:**
- Sync channel for provider name retrieval
- Async handlers for window lifecycle, media permissions, screen picker, credentials

**Flow:**
Renderer/Preload -> ipcRenderer.send/invoke -> Main Process -> ipcMain.handle -> Return response

**Timestamp:** 2026-04-04

## Narrative
### Structure
IPC channels organized into: Sync channels (get-provider-sync), Async handlers (window lifecycle, media, screen picker, credentials, language, cache), and Renderer→Main send channels (screen-sharing-source-responded).

### Highlights
18 async IPC channels for comprehensive window management. Channels include screen recording permission check (macOS), external URL opening, screen picker UI triggering, window lifecycle (create/close), webview dev tools, IPC connectivity test, handshake confirmation, renderer ready signal, URL request/receipt, webview state tracking (created/loading/ready/failed), credentials retrieval (Pexip), language detection, and desktop capturer cache prewarming.

### Examples
Example: Renderer calls video-call-window/request-url handler, receives {success, url, autoOpenDevtools}. Example: Main calls video-call-window/open-window with {url, options: {providerName, credentials}}
