---
title: Video Call Window Lifecycle and State Management
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:45:28.664Z'
updatedAt: '2026-04-04T18:45:28.664Z'
---
## Raw Concept
**Task:**
Document window lifecycle, state persistence, and cleanup procedures

**Changes:**
- Window bounds persistence with validation
- Graceful destruction with polling
- Lifecycle event tracking

**Files:**
- src/videoCallWindow/ipc.ts

**Flow:**
Creation: store credentials -> wait destruction -> close existing -> calculate bounds -> create window -> load HTML -> setup webview -> set pending URL. Cleanup: close event -> set destroying flag -> closed event -> clear credentials -> cleanupVideoCallWindow removes listeners and closes window.

**Timestamp:** 2026-04-04

## Narrative
### Structure
Window lifecycle managed through global state variables: videoCallWindow, isVideoCallWindowDestroying, pendingVideoCallUrl, videoCallCredentials, videoCallProviderName. Creation follows 9-step flow. Cleanup follows 3-step process with 50ms destruction delay.

### Dependencies
Window bounds persistence requires state.isVideoCallWindowPersistenceEnabled flag and valid screen bounds. Destruction polling uses DESTRUCTION_CHECK_INTERVAL (50ms). Webview polling uses WEBVIEW_CHECK_INTERVAL (100ms).

### Highlights
Window bounds fallback: 80% of nearest screen, centered. Persistence validates bounds must be inside some screen with non-zero dimensions. Lifecycle events (show, hide, focus, blur, maximize, unmaximize, minimize, restore, resize, move) dispatch VIDEO_CALL_WINDOW_STATE_CHANGED (debounced 1000ms). Statistics tracking: videoCallWindowCreationCount and videoCallWindowDestructionCount.

### Rules
Rule 1: DESTRUCTION_CHECK_INTERVAL = 50ms
Rule 2: DEVTOOLS_TIMEOUT = 2000ms
Rule 3: WEBVIEW_CHECK_INTERVAL = 100ms
Rule 4: Window bounds debounce = 1000ms
Rule 5: Destruction must complete before new window creation
