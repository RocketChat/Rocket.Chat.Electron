---
title: Request-Response Utility
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:11:41.395Z'
updatedAt: '2026-04-04T18:11:41.395Z'
---
## Raw Concept
**Task:**
Implement request-response pattern with Promise-based API and typed payloads

**Files:**
- src/store/index.ts

**Flow:**
request(requestAction, ...types) -> Generate unique ID -> Listen for matching response -> Dispatch with meta -> Await response -> Resolve/reject Promise

## Narrative
### Structure
request() generic function that takes request action and response types. Generates unique ID, sets up listener for matching response, dispatches action with request meta, and returns Promise that resolves with payload or rejects with error.

### Highlights
Fully typed with TypeScript generics. Supports multiple response types. Auto-cleanup of listener after response received. Handles both success (hasPayload) and error (isErrored) responses.

### Rules
Rule 1: request() throws if store not initialized
Rule 2: Unique ID generated via Math.random().toString(36).slice(2)
Rule 3: Request action dispatched with meta: {request: true, id: <generated>}
Rule 4: Listener awaits isResponseTo(id, ...types) predicate match
Rule 5: If response isErrored(), Promise rejects with action.payload (Error)
Rule 6: If response hasPayload(), Promise resolves with action.payload
Rule 7: Listener unsubscribed immediately after response received
Rule 8: TypeScript types ensure response payload type matches response action type

### Examples
const config = await request({type: "GET_CONFIG"}, "CONFIG_RESPONSE")
const servers = await request({type: "FETCH_SERVERS"}, "SERVERS_LOADED", "SERVERS_ERROR")
// Response action: {type: "CONFIG_RESPONSE", payload: {...}, meta: {response: true, id: "abc123"}}
