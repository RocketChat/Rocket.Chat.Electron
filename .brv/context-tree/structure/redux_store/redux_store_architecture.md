---
title: Redux Store Architecture
tags: []
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:11:41.389Z'
updatedAt: '2026-04-04T18:25:21.435Z'
---
## Raw Concept
**Task:**
Document Redux store architecture and FSA pattern in Rocket.Chat Electron

**Changes:**
- Single Redux store shared across main + renderer via IPC
- FSA pattern for all actions with type and payload
- Memoized selectors using reselect createSelector
- Domain-split reducers for modular state management

**Files:**
- src/store/index.ts
- src/store/actions.ts
- src/store/rootReducer.ts
- src/ui/selectors.ts
- src/ui/actions.ts

**Flow:**
Action dispatch -> Reducer processes -> State update -> Selector memoizes -> UI re-renders

**Timestamp:** 2026-04-04

## Narrative
### Structure
Single Redux store in src/store/ contains RootState with domain-split reducers. State is shared across main process and renderer processes via IPC synchronization. Actions are aggregated from multiple modules in store/actions.ts with centralized ActionTypeToPayloadMap type system.

### Dependencies
Requires reselect for memoized selectors. IPC middleware synchronizes store state between main and renderer. store/index.ts exports request() helper for async request/response patterns.

### Highlights
FSA pattern ensures type-safe action payloads. selectGlobalBadge aggregates all server badges into single count or dot indicator. Reducers split by domain: servers, currentView, trustedCertificates, notTrustedCertificates, isMinimizeOnCloseEnabled, isSideBarEnabled, isMenuBarEnabled, userThemePreference, videoCallWindowState.

### Examples
selectGlobalBadge returns aggregated badge count across all servers or "•" indicator if any server has unread. selectGlobalBadgeText converts badge to displayable string format.
