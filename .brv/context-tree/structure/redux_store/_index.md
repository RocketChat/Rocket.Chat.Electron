---
children_hash: b5d060251e32d696a762aea7bef4f69b2e0e60079f105d6c6eb9f389c54b0ace
compression_ratio: 0.18758398280032249
condensation_order: 1
covers: [badge_selector_implementation.md, download_state_management.md, flux_standard_action_validation.md, fsa_type_system_and_validation.md, ipc_middleware_synchronization.md, preload_dispatch_pattern.md, public_api_methods.md, reducer_slices_organization.md, redux_store_architecture.md, request_response_utility.md, root_reducer_configuration.md, service_base_class.md, ui_action_type_mappings.md, ui_actions_and_selectors.md]
covers_token_total: 7442
summary_level: d1
token_count: 1396
type: summary
---
# Redux Store Architecture Summary

## Core Architecture

The Redux store in Rocket.Chat Electron implements a **Flux Standard Action (FSA) pattern** with a single shared store across main and renderer processes synchronized via IPC middleware. The store exports six core public API methods: `dispatch()`, `select()`, `safeSelect()`, `watch()`, `listen()`, and `request()`.

## State Organization

**RootState** combines ~50 reducer slices organized into 10 functional domains:

1. **App Core** — appPath, appVersion, machineTheme, mainWindowTitle, screenCaptureFallback
2. **Server Management** — servers, lastSelectedServerUrl
3. **Navigation/Security** — clientCertificates, externalProtocols, trustedCertificates
4. **Downloads** — download state keyed by itemId with CREATED/UPDATED/REMOVED/CLEARED actions
5. **Updates** — version checking, update configuration, channels, error states
6. **UI Flags** — menuBar, sidebar, tray, minimize-on-close, flash frame, hardware acceleration, transparency
7. **Window State** — rootWindowState, rootWindowIcon, currentView, dialogs
8. **Video Calls** — videoCallWindowState, persistence, devtools, screen capture fallback
9. **Outlook Integration** — calendar sync intervals and connection settings
10. **Other** — Jitsi servers, browser selection, theme preference, developer mode, logging

See **reducer_slices_organization.md** for complete reducer inventory.

## Action System

### FSA Validation & Type Safety

**flux_standard_action_validation.md** and **fsa_type_system_and_validation.md** define 9 type guard predicates:
- `isFSA()` — validates action shape (object, non-null, non-array, string type)
- `hasMeta()`, `isResponse()`, `isRequest()` — meta field validation
- `isLocallyScoped()`, `isSingleScoped()` — scope validation
- `isErrored()`, `hasPayload()` — payload validation
- `isResponseTo(id, ...types)` — curried factory for request/response matching

**FluxStandardAction<Type, Payload>** generic type produces `{type: Type}` when Payload=void, otherwise includes payload field.

### UI Actions

**ui_action_type_mappings.md** and **ui_actions_and_selectors.md** define 100+ action types organized by namespace:
- ABOUT_DIALOG_*, ADD_SERVER_*, MENU_BAR_*, SIDE_BAR_*, WEBVIEW_*, SETTINGS_*, DOWNLOADS_*, UPDATE_*, VIDEO_CALL_*

**UiActionTypeToPayloadMap** provides exhaustive type checking for all actions. Server-related actions include `url` field; settings actions use specific types (boolean, string, number, enum).

## Selector System

**badge_selector_implementation.md** documents memoized selectors using reselect `createSelector()`:
- `selectGlobalBadge()` — aggregates mention count across all servers, returns number | "•" | undefined
- `selectGlobalBadgeText()` — formats badge for display (string output)
- `selectGlobalBadgeCount()` — provides numeric fallback (0 if no badge)

Memoization prevents unnecessary re-renders by caching results across selector calls.

## IPC Synchronization

**ipc_middleware_synchronization.md** describes bidirectional store sync:
- `forwardToRenderers` middleware in main process maintains Set<WebContents> of active renderers
- `forwardToMain` middleware in renderer process dispatches incoming actions
- Action scoping prevents infinite loops: LOCAL scope stays in current process, SINGLE scope targets specific webContents, default broadcasts to all renderers
- Renderers auto-register on "redux/get-initial-state" IPC and auto-cleanup on WebContents destroyed

## Preload Integration

**preload_dispatch_pattern.md** documents webview-to-Redux dispatch pattern:
- Preload modules (badge.ts, userLoggedIn.ts, sidebar.ts) import `dispatch()` from shared store
- Each action includes `url` payload from `getServerUrl()` for server context
- Seven action types dispatched: WEBVIEW_UNREAD_CHANGED, WEBVIEW_USER_LOGGED_IN, WEBVIEW_FAVICON_CHANGED, WEBVIEW_TITLE_CHANGED, WEBVIEW_SIDEBAR_STYLE_CHANGED, WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED, WEBVIEW_GIT_COMMIT_HASH_CHANGED

## Async Patterns

### Request-Response Utility

**request_response_utility.md** implements Promise-based async pattern:
- `request(requestAction, ...types)` generates unique ID, sets up listener, dispatches with request meta, returns Promise
- Listener awaits `isResponseTo(id, ...types)` predicate match
- Rejects with error if response `isErrored()`, resolves with payload if `hasPayload()`
- Auto-cleanup of listener after response received

### Download State Management

**download_state_management.md** manages downloads via Redux:
- State is Record<Download["itemId"], Download> keyed by numeric itemId
- Actions: DOWNLOAD_CREATED, DOWNLOAD_UPDATED (shallow merge), DOWNLOAD_REMOVED, DOWNLOADS_CLEARED
- APP_SETTINGS_LOADED rehydrates from persisted state, cancelling any in-progress downloads

## Service Base Class

**service_base_class.md** provides lifecycle management:
- Abstract Service class with `initialize()`/`destroy()` hooks
- Protected `watch()` and `listen()` helpers auto-register unsubscribers
- `setUp()` calls initialize(), `tearDown()` unsubscribes all and calls destroy()
- Eliminates manual subscription cleanup

## Public API

**public_api_methods.md** exports:
- `dispatch(action)` — broadcasts to all renderers
- `select(selector)` — synchronous state read, throws if store not initialized
- `safeSelect(selector)` — returns undefined if store not initialized
- `watch(selector, watcher)` — subscribes to selector changes with Object.is equality
- `listen(type|predicate, listener)` — subscribes to action types
- All subscription methods return unsubscribe function