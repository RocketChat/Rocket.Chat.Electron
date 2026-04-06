---
title: IPC Middleware Synchronization
tags: []
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:11:41.393Z'
updatedAt: '2026-04-04T18:13:30.532Z'
---
## Raw Concept
**Task:**
Document Redux store IPC synchronization between main and renderer processes

**Changes:**
- Implemented forwardToRenderers middleware in main process
- Implemented forwardToMain middleware in renderer process
- Action scoping with LOCAL, SINGLE, and broadcast modes

**Files:**
- src/store/ipc.ts
- src/ipc/main.ts
- src/ipc/renderer.ts
- src/store/fsa.ts

**Flow:**
Renderer action -> IPC invoke -> Main dispatch -> Forward to renderers -> Renderer dispatch

## Narrative
### Structure
IPC synchronization implemented via two middleware functions in src/store/ipc.ts. forwardToRenderers runs in main process and maintains a Set<WebContents> of active renderers. forwardToMain runs in renderer process and handles incoming actions from main.

### Dependencies
Depends on Electron WebContents API, Redux middleware pattern, IPC handlers from src/ipc/main.ts and src/ipc/renderer.ts, FSA validation utilities from src/store/fsa.ts

### Highlights
Prevents infinite loops through action scoping (LOCAL scope stays in current process). Supports targeted delivery via SINGLE scope (specific webContentsId or viewInstanceId). Automatic renderer registration and cleanup on destruction.

### Rules
Rule 1: LOCAL scoped actions (meta.scope="local") stay in current process and are not forwarded
Rule 2: SINGLE scoped actions target specific webContents by webContentsId or viewInstanceId
Rule 3: Default/broadcast actions are forwarded to all registered renderers
Rule 4: Main process adds meta.scope="local" to forwarded actions to prevent re-forwarding
Rule 5: Renderer process sends actions to main via IPC and returns immediately without passing to next()
Rule 6: Renderers are automatically registered on "redux/get-initial-state" IPC and removed on WebContents destroyed event

## Facts
- **redux_ipc_sync**: Redux store IPC synchronization keeps main and renderer Redux stores in sync via src/store/ipc.ts [project]
- **forward_to_renderers**: forwardToRenderers middleware runs in main process and maintains a Set<WebContents> of all active renderers [project]
- **forward_to_main**: forwardToMain middleware runs in renderer process and dispatches actions from main into local renderer store [project]
- **action_scoping**: Action scoping uses three modes: LOCAL (stays in current process), SINGLE (targets one webContents), and DEFAULT/broadcast (forwarded to all renderers) [convention]
