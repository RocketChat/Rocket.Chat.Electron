---
title: Server State Reducer
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:16:26.072Z'
updatedAt: '2026-04-04T18:16:26.072Z'
---
## Raw Concept
**Task:**
Manage server state mutations via Redux reducer

**Changes:**
- Handles 20+ action types updating server properties
- upsert() adds new servers or updates existing by URL
- update() only modifies existing servers
- Supports sorting, removal, and field-specific updates

**Files:**
- src/servers/reducers.ts

**Flow:**
Action dispatched -> reducer matches type -> upsert/update/filter server state -> return new state array

## Narrative
### Structure
servers reducer in src/servers/reducers.ts handles ServersActionTypes union. upsert() finds server by URL, merges new properties, returns new array. update() only modifies if server exists. ensureUrlFormat() validates URL format or throws error.

### Dependencies
Imports action types from ui/actions, app/actions, deepLinks/actions, outlookCalendar/actions, and servers/actions. Depends on Server type from common.ts.

### Highlights
Handles webview lifecycle events (DID_START_LOADING, DID_FAIL_LOAD, READY, ATTACHED). Supports version validation updates (WEBVIEW_SERVER_IS_SUPPORTED_VERSION, WEBVIEW_SERVER_VERSION_UPDATED). Manages Outlook credentials and custom themes.

### Rules
Rule 1: upsert() creates new state array (immutable)
Rule 2: update() returns unchanged state if server URL not found
Rule 3: SERVERS_LOADED and APP_SETTINGS_LOADED ensure URL format
Rule 4: SIDE_BAR_SERVERS_SORTED preserves server order via indexOf()
Rule 5: WEBVIEW_DID_FAIL_LOAD only sets failed=true for mainFrame
