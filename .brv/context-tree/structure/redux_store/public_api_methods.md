---
title: Public API Methods
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:11:41.391Z'
updatedAt: '2026-04-04T18:11:41.391Z'
---
## Raw Concept
**Task:**
Document all public API methods for Redux store interaction

**Files:**
- src/store/index.ts

**Flow:**
User calls API method -> Validates store exists -> Performs operation -> Returns result or void

## Narrative
### Structure
Six core public API methods plus two derived methods (safeSelect variant, Service class helpers).

### Highlights
dispatch() and select() are the primary methods. safeSelect() adds undefined-safety check. watch() and listen() provide reactive subscriptions. request() enables request-response patterns.

### Rules
Rule 1: dispatch(action) broadcasts action to all renderers, requires store to be initialized
Rule 2: select(selector) synchronously reads state, throws if store not initialized
Rule 3: safeSelect(selector) returns undefined if store not initialized instead of throwing
Rule 4: watch(selector, watcher) subscribes to selector changes with Object.is equality
Rule 5: listen(type, listener) or listen(predicate, listener) subscribes to action types
Rule 6: All subscription methods return unsubscribe function
Rule 7: Service.watch() and Service.listen() auto-register unsubscribers for cleanup

### Examples
dispatch({type: "SERVERS_UPDATED", payload: []})
const servers = select(state => state.servers)
const servers = safeSelect(state => state.servers) // returns undefined if store not ready
const unsubscribe = watch(state => state.servers, (curr, prev) => {})
const unsubscribe = listen("SERVERS_UPDATED", (action) => {})
const unsubscribe = listen(isServerAction, (action) => {})
