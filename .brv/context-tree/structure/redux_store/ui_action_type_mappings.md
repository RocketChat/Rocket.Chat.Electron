---
title: UI Action Type Mappings
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:25:38.642Z'
updatedAt: '2026-04-04T18:25:38.642Z'
---
## Raw Concept
**Task:**
Document comprehensive UI action type constants and payload mappings for Rocket.Chat Electron

**Changes:**
- Defined 100+ action type constants across multiple namespaces
- Created UiActionTypeToPayloadMap for type-safe action dispatch
- Organized actions by domain: dialogs, menu bar, sidebar, webview, settings, touch bar

**Files:**
- src/ui/actions.ts

**Flow:**
Component dispatches action -> reducer receives typed payload -> store updates -> selector memoizes -> UI re-renders

**Timestamp:** 2026-04-04

## Narrative
### Structure
Action types organized by namespace prefix: ABOUT_DIALOG_*, ADD_SERVER_*, CLEAR_CACHE_*, LOADING_ERROR_*, MENU_BAR_*, ROOT_WINDOW_*, VIDEO_CALL_*, SIDE_BAR_*, WEBVIEW_*, TOUCH_BAR_*, UPDATE_*, SETTINGS_*, DOWNLOADS_*, SUPPORTED_VERSION_*, OPEN_SERVER_INFO_MODAL, CLOSE_SERVER_INFO_MODAL. Each action has corresponding UiActionTypeToPayloadMap type entry defining exact payload structure.

### Dependencies
Imports Server type from servers/common, WebContents from electron, RootWindowIcon and WindowState from ui/common. All payloads are strictly typed for compile-time safety.

### Highlights
UiActionTypeToPayloadMap provides exhaustive type checking for all 100+ actions. Some actions have void payload (dialogs), others have complex nested objects (server info modal). WEBVIEW_* actions carry server URL and various state information. SETTINGS_* actions handle configuration changes with specific types (boolean, string, number, enum).

### Rules
Rule 1: All action types must have corresponding entry in UiActionTypeToPayloadMap
Rule 2: Payload types must match the semantic meaning of the action
Rule 3: Server-related actions include url field of type Server["url"]
Rule 4: Settings actions use specific types: boolean for toggles, string for selections, number for intervals, enum strings for preferences

### Examples
MENU_BAR_SELECT_SERVER_CLICKED: Server["url"] - passes selected server URL
SETTINGS_USER_THEME_PREFERENCE_CHANGED: "auto" | "light" | "dark" - theme selection
OPEN_SERVER_INFO_MODAL: complex object with url, version, exchangeUrl, isSupportedVersion, supportedVersionsSource, supportedVersionsFetchState, supportedVersions
