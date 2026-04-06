---
title: Document Viewer IPC System
tags: []
related: [electron_apps/rocketchat_desktop/integrations/screen_sharing_ipc_channels.md, structure/redux_store/redux_store_architecture.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:16:15.968Z'
updatedAt: '2026-04-04T18:16:15.968Z'
---
## Raw Concept
**Task:**
Implement document viewer IPC handlers for opening documents (PDF, etc.) from server webviews

**Changes:**
- Handles document-viewer/open-window IPC channel for opening documents in dedicated window
- Handles document-viewer/fetch-content IPC channel for fetching document content with server credentials
- Listens to WEBVIEW_PDF_VIEWER_ATTACHED action to intercept external navigation in PDF viewer
- Uses server-scoped session partitions for authenticated document fetching

**Files:**
- src/documentViewer/ipc.ts

**Flow:**
Webview requests document -> IPC validation -> Server lookup -> Redux dispatch -> Viewer window opens OR Content fetched via authenticated session

**Timestamp:** 2026-04-04

## Narrative
### Structure
Document viewer system in src/documentViewer/ with single ipc.ts file handling two main IPC channels and one Redux action listener. Architecture uses server-scoped session partitions (persist:serverUrl) to maintain authenticated context.

### Dependencies
Requires Redux store for server lookup, Electron session API for partition-scoped fetching, ipc/main handler registration, browserLauncher.openExternal() for external protocol handling

### Highlights
Automatic credential injection via server session cookies, protocol validation (http/https only), same-origin constraints on document fetching, external protocol interception (zoommtg://) routed to system handler

### Rules
Rule 1: Only http/https protocols allowed for document URLs
Rule 2: Document origin must match server origin for fetch-content
Rule 3: External protocols (non-http/https/file/data/about) are routed to openExternal()
Rule 4: PDF viewer will-navigate handler skips video-call-window.html contexts to avoid interfering with video call navigation

### Examples
Example flow: User clicks PDF link in webview -> document-viewer/open-window called with URL -> validates protocol -> finds server by origin -> dispatches SERVER_DOCUMENT_VIEWER_OPEN_URL action -> UI opens viewer window. Example fetch: document-viewer/fetch-content called with document URL and server URL -> creates session from persist:serverUrl partition -> fetches with authenticated cookies -> returns text content.
