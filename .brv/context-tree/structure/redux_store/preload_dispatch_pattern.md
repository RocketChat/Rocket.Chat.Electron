---
title: Preload Dispatch Pattern
tags: []
related: [structure/redux_store/ui_actions_and_selectors.md, electron_apps/rocketchat_desktop/integrations/ipc_communication_system.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:33:01.103Z'
updatedAt: '2026-04-04T18:33:01.103Z'
---
## Raw Concept
**Task:**
Document the preload dispatch pattern for Redux action dispatching from webview context

**Changes:**
- Preload modules directly import and call dispatch() from shared Redux store
- Each preload action includes url payload with getServerUrl() for server context
- Pattern supports multiple webview-initiated actions (badge, user login, sidebar styles)

**Files:**
- src/servers/preload/badge.ts
- src/servers/preload/userLoggedIn.ts
- src/servers/preload/sidebar.ts

**Flow:**
Preload module -> import dispatch -> import action type -> call dispatch({type, payload: {url, ...data}}) -> Redux store updates

**Timestamp:** 2026-04-04

**Patterns:**
- `import\s+\{\s*dispatch\s*\}\s+from\s+['"].*store['"]` (flags: g) - Import dispatch from shared Redux store in preload modules
- `dispatch\(\{\s*type:\s*[A-Z_]+,\s*payload:\s*\{\s*url:\s*getServerUrl\(\)` (flags: g) - Dispatch action with url and data payload pattern

## Narrative
### Structure
Preload scripts in src/servers/preload/ (badge.ts, userLoggedIn.ts, sidebar.ts) each implement the dispatch pattern. Each module imports dispatch from src/store and action type constants from src/ui/actions. Functions call dispatch with {type, payload} where payload includes url from getServerUrl() plus action-specific data.

### Dependencies
Depends on: src/store for dispatch function, src/ui/actions for action type constants, getServerUrl() from ./urls for current server context. Preload scripts run in renderer context but have access to shared Redux store.

### Highlights
Unified pattern across all preload modules enables consistent Redux state updates from webview. getServerUrl() ensures actions are scoped to correct server. Supports 7 distinct action types: badge updates, user login state, favicon/title changes, sidebar styling, custom themes, and git commit hashes.

### Rules
Rule 1: Always import dispatch from shared store, not create local dispatch
Rule 2: Include url payload derived from getServerUrl() to scope action to correct server
Rule 3: Use action type constants from src/ui/actions, not string literals
Rule 4: Payload structure matches Server type definitions for type safety

### Examples
Example 1 - Badge dispatch: dispatch({type: WEBVIEW_UNREAD_CHANGED, payload: {url: getServerUrl(), badge}})
Example 2 - User login: dispatch({type: WEBVIEW_USER_LOGGED_IN, payload: {url: getServerUrl(), userLoggedIn}})
Example 3 - Sidebar style: dispatch({type: WEBVIEW_SIDEBAR_STYLE_CHANGED, payload: {url: getServerUrl(), style: sideBarStyle}})

## Facts
- **preload_dispatch_pattern**: Preload modules use dispatch() to push Redux actions from webview context [project]
- **server_url_context**: getServerUrl() returns the current server URL from preload context [convention]
- **preload_action_types**: Seven distinct action types are dispatched from preload: WEBVIEW_UNREAD_CHANGED, WEBVIEW_USER_LOGGED_IN, WEBVIEW_FAVICON_CHANGED, WEBVIEW_TITLE_CHANGED, WEBVIEW_SIDEBAR_STYLE_CHANGED, WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED, WEBVIEW_GIT_COMMIT_HASH_CHANGED [project]
