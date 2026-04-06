---
title: 'Data Flow: Server Selection and Badge Updates'
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:31:19.349Z'
updatedAt: '2026-04-04T18:31:19.349Z'
---
## Raw Concept
**Task:**
Document user interaction flows for server selection and badge updates

**Flow:**
Server Selection: User clicks SideBar → SIDE_BAR_SERVER_SELECTED action → currentView reducer → useServers hook reselects → ServerPane shows/hides
Badge Updates: Server webapp calls window.RocketChatDesktop.setBadge() → preload dispatches WEBVIEW_UNREAD_CHANGED → servers reducer → SideBar re-renders badge
Add Server: AddServerView → SERVER_URL_RESOLUTION_REQUESTED → main.ts resolveServerUrl() → SERVER_URL_RESOLVED → ADD_SERVER_VIEW_SERVER_ADDED → servers reducer appends

**Timestamp:** 2026-04-04

## Narrative
### Structure
Three key data flows connect UI to Redux: server selection (user click → action → reducer → reselect → re-render), badge updates (webapp → preload → action → reducer → re-render), and add server (form → action → main process → resolver → action → reducer).

### Dependencies
Requires preload bridge (window.RocketChatDesktop.setBadge()). Requires useServers hook with reselect memoization. Requires main process server resolver.

### Highlights
Each flow uses FSA (Flux Standard Action) pattern. Badge updates flow through preload bridge from webapp. Server selection uses currentView reducer to track which server is active. Add server flow bridges UI and main process via IPC request/response.
