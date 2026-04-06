---
title: Flux Standard Action Validation
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:11:41.392Z'
updatedAt: '2026-04-04T18:11:41.392Z'
---
## Raw Concept
**Task:**
Validate and type-check Redux actions using Flux Standard Action pattern

**Files:**
- src/store/fsa.ts

**Flow:**
Action object -> Check type field -> Validate meta/payload structure -> Return type guard result

## Narrative
### Structure
Eight validation predicates: isFSA (base), hasMeta, isResponse, isRequest, isLocallyScoped, isSingleScoped, isErrored, hasPayload, plus isResponseTo() factory.

### Highlights
isFSA validates basic action shape. Meta field predicates check request/response markers and scope. Typed predicates enable TypeScript type narrowing. isResponseTo() factory creates predicates for matching response actions by ID.

### Rules
Rule 1: isFSA checks: typeof object, not null, not array, has type field that is string
Rule 2: hasMeta checks: meta field exists and is non-null object
Rule 3: isResponse checks: meta.response === true AND meta.id exists
Rule 4: isRequest checks: meta.request === true AND meta.id exists
Rule 5: isLocallyScoped checks: meta.scope === "local"
Rule 6: isSingleScoped checks: ipcMeta.webContentsId exists AND ipcMeta.scope === "single"
Rule 7: isErrored checks: error === true AND payload instanceof Error
Rule 8: hasPayload checks: payload field exists in action
Rule 9: isResponseTo(id, ...types) matches: isResponse(action) AND types.includes(action.type) AND action.meta.id === id

### Examples
isFSA({type: "ACTION", payload: 123}) returns true
hasMeta({type: "ACTION", meta: {}}) returns true
isResponse({type: "RESPONSE", meta: {response: true, id: "abc"}}) returns true
isLocallyScoped({type: "ACTION", meta: {scope: "local"}}) returns true
