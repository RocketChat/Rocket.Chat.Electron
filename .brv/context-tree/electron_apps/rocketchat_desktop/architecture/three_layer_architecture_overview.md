---
title: Three-Layer Architecture Overview
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:31:19.338Z'
updatedAt: '2026-04-04T18:31:19.338Z'
---
## Raw Concept
**Task:**
Document the three-layer architecture of Rocket.Chat Electron (Main Process, Redux Store, Renderer)

**Files:**
- src/servers/main.ts
- src/navigation/main.ts
- src/deepLinks/main.ts
- src/store/
- src/ui/components/Shell/index.tsx

**Flow:**
Main Process (servers, navigation, deepLinks) → Redux Store (FSA actions, reselect selectors) → Renderer/React (Shell, SideBar, ServersView, webviews)

**Timestamp:** 2026-04-04

## Narrative
### Structure
Three-layer architecture: Layer 1 (Main Process) handles server resolution, certificate trust, and deep link parsing. Layer 2 (Redux Store) provides single source of truth with FSA actions and memoized reselect selectors shared via IPC. Layer 3 (Renderer/React) renders Shell root component with SideBar + ServersView layout, each server in persistent webview via ReparentingContainer.

### Dependencies
Redux store is shared between main and renderer processes via IPC middleware. Each layer depends on the previous layer for data flow.

### Highlights
Separation of concerns between Electron main process, state management, and React UI. IPC synchronization between layers enables reactive updates across the application.
