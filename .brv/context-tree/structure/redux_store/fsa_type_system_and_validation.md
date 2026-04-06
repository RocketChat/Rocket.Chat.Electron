---
title: FSA Type System and Validation
tags: []
related: [structure/redux_store/redux_store_architecture.md, structure/redux_store/request_response_utility.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:15:14.279Z'
updatedAt: '2026-04-04T18:15:14.279Z'
---
## Raw Concept
**Task:**
Document Flux Standard Action (FSA) type system with TypeScript type guards and validators

**Files:**
- src/store/fsa.ts

**Flow:**
Action object -> isFSA check -> type guard validation -> meta inspection -> response/request pairing

**Timestamp:** 2026-04-04

**Patterns:**
- `FluxStandardAction<Type, Payload>` - Generic type that produces {type: Type} when Payload=void, otherwise {type: Type; payload: Payload}
- `action is Action` - TypeScript type predicate syntax used in all type guard functions

## Narrative
### Structure
FSA type system defined in src/store/fsa.ts exports a generic FluxStandardAction type and 9 type guard functions (isFSA, hasMeta, isResponse, isRequest, isLocallyScoped, isSingleScoped, isErrored, hasPayload, isResponseTo) that validate and narrow action types.

### Highlights
Type-safe action validation. Conditional payload handling based on generic Payload type parameter. Response/request pairing via curried isResponseTo predicate. Support for local and single-scoped actions via meta properties.

### Rules
Rule 1: isFSA validates action is object with string type property
Rule 2: hasMeta checks action has non-null object meta property
Rule 3: isResponse requires meta.response===true and meta.id
Rule 4: isRequest requires meta.request===true and meta.id
Rule 5: isLocallyScoped requires meta.scope==="local"
Rule 6: isSingleScoped requires ipcMeta.webContentsId and ipcMeta.scope==="single"
Rule 7: isErrored requires error===true and payload instanceof Error
Rule 8: hasPayload checks existence of payload property
Rule 9: isResponseTo is curried factory returning predicate for request/response matching by id and type

### Examples
FluxStandardAction<"USER_LOGIN"> produces {type: "USER_LOGIN"}
FluxStandardAction<"USER_LOGIN", {email: string}> produces {type: "USER_LOGIN"; payload: {email: string}}
isResponseTo(requestId, "USER_LOGIN", "USER_LOGOUT") creates predicate matching responses to that requestId with either type
