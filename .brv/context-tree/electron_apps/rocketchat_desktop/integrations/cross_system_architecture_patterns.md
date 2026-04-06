---
title: Cross-System Architecture Patterns
tags: []
related: [electron_apps/rocketchat_desktop/integrations/ipc_communication_system.md, structure/redux_store/redux_store_architecture.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:22:24.915Z'
updatedAt: '2026-04-04T18:22:24.915Z'
---
## Raw Concept
**Task:**
Document core architectural patterns used across all Rocket.Chat Desktop subsystems

**Changes:**
- Documented core process layer pattern (main.ts + preload.ts + renderer.ts)
- Documented Redux-driven IPC communication pattern
- Documented Service class pattern for extended systems
- Documented Action Type Maps pattern for FSA actions

**Files:**
- src/main.ts
- src/preload.ts
- src/store/index.ts

**Flow:**
Feature request -> Main process (native APIs) -> Redux store -> IPC bridge -> Preload -> Renderer (web APIs)

**Patterns:**
- `^\w+/\w+-\w+$` - Action type naming pattern: namespace/action-name
- `ActionTypeToPayloadMap` - Interface pattern for typed FSA action payloads

## Narrative
### Structure
Every feature follows a three-layer process model: main.ts handles native Electron APIs, optional preload.ts bridges IPC context, optional renderer.ts uses web APIs. All cross-process communication flows through Redux store using Flux Standard Actions.

### Dependencies
Depends on Redux for state management, Electron for IPC, FSA for action standardization

### Highlights
Service class pattern (I18nService, AttentionDrawingService) extends base Service providing lifecycle hooks (setUp, tearDown) and protected helpers (listen, dispatch, select)

### Rules
Rule 1: All cross-process communication uses Redux store, never direct ipcRenderer.invoke()
Rule 2: Each subsystem exports ActionTypeToPayloadMap interface
Rule 3: Service classes must extend base Service class from ../store
