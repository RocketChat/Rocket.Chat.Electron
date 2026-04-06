---
title: Notification System Architecture
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:09:13.444Z'
updatedAt: '2026-04-04T18:09:13.444Z'
---
## Raw Concept
**Task:**
Implement multi-layer notification system spanning main, preload, and renderer processes

**Files:**
- src/notifications/main.ts
- src/notifications/preload.ts
- src/notifications/renderer.ts
- src/notifications/attentionDrawing.ts
- src/notifications/common.ts

**Flow:**
Request (preload) -> IPC dispatch -> Main process Redux listener -> Create/Update Notification -> Dispatch response -> Event handlers (show/click/close/reply/action)

**Timestamp:** 2026-04-04

**Patterns:**
- `^NOTIFICATIONS_[A-Z_]+$` - Redux action type constants for notification events
- `^/^data:/` - Data URL prefix check for icon resolution

## Narrative
### Structure
The notification system spans 3 Electron process layers: (1) Main process (main.ts) manages native Notification objects and Redux state, (2) Preload/webview context (preload.ts) exposes createNotification() API and event handler management, (3) Renderer process (renderer.ts) intercepts window.Notification and routes through IPC pipeline. AttentionDrawing service handles visual attention (dock bounce on macOS, frame flash on other platforms).

### Dependencies
Depends on Redux store for state dispatch/listen, Electron IPC for cross-process communication, Electron native APIs (Notification, nativeImage, app.dock, browserWindow), and icon fetching via IPC handler.

### Highlights
Notification deduplication via tag-based updateNotification(), icon resolution with ArrayBuffer->Uint8Array->createFromDataURL conversion, event handler mapping for show/click/close/reply/action events, voice notification attention drawing (only for notificationType="voice"), category-based routing (DOWNLOADS vs SERVER).

### Rules
Rule 1: Notifications are deduplicated by tag - if tag exists, updateNotification() is called instead of creating new
Rule 2: Voice notifications trigger attention drawing (dock bounce on macOS, frame flash elsewhere)
Rule 3: Icon URLs are normalized - data URLs used directly, relative URLs converted to absolute, http(s) URLs fetched and cached
Rule 4: Notification events (show/click/close/reply/action) are routed through eventHandlers Map<id, callback>
Rule 5: Category-based routing: DOWNLOADS category dispatches SIDE_BAR_DOWNLOADS_BUTTON_CLICKED, SERVER category dispatches WEBVIEW_FOCUS_REQUESTED

### Examples
Example notification creation: `createNotification({ title: "Alert", body: "New message", icon: "/avatar.png", notificationType: "voice", category: "SERVER" })` - this will create a native notification and trigger attention drawing on voice type.
Example icon resolution: data URLs like "data:image/png;base64,..." are used directly, while "https://example.com/icon.png" is fetched and converted to data URL for caching.
