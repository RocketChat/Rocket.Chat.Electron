---
title: Service Base Class
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:11:41.394Z'
updatedAt: '2026-04-04T18:11:41.394Z'
---
## Raw Concept
**Task:**
Provide base class for services with Redux subscription lifecycle management

**Files:**
- src/store/index.ts

**Flow:**
Service.setUp() -> initialize() -> watch/listen register unsubscribers -> Service.tearDown() -> unsubscribe all -> destroy()

## Narrative
### Structure
Abstract Service class with protected initialize()/destroy() lifecycle hooks and protected watch()/listen() helpers. Maintains Set of unsubscribers for automatic cleanup.

### Highlights
Eliminates manual subscription cleanup. Protected watch() and listen() methods auto-register unsubscribers. setUp() calls initialize(), tearDown() unsubscribes all and calls destroy().

### Rules
Rule 1: Service is abstract, must be subclassed
Rule 2: initialize() and destroy() are no-op by default, override to add logic
Rule 3: Protected watch() wraps global watch() and adds unsubscriber to Set
Rule 4: Protected listen() wraps global listen() and adds unsubscriber to Set
Rule 5: setUp() must be called to run initialize()
Rule 6: tearDown() must be called to cleanup subscriptions and run destroy()
Rule 7: All unsubscribers are called in tearDown() before destroy()

### Examples
class MyService extends Service {
  protected initialize() { this.watch(state => state.servers, ...) }
  protected destroy() { /* cleanup */ }
}
const svc = new MyService()
svc.setUp() // calls initialize(), registers watchers
svc.tearDown() // unsubscribes all, calls destroy()
