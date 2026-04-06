---
title: UI Actions and Selectors
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:25:21.438Z'
updatedAt: '2026-04-04T18:25:21.438Z'
---
## Raw Concept
**Task:**
Document UI action types and memoized selectors for Rocket.Chat Electron UI

**Changes:**
- Comprehensive UI action namespace with 100+ action types
- Memoized selectors using reselect for performance
- Type-safe action payload mapping via UiActionTypeToPayloadMap

**Files:**
- src/ui/actions.ts
- src/ui/selectors.ts
- src/ui/common.ts

**Flow:**
UI event -> dispatch action -> reducer -> selector memoizes -> component re-renders only if selected state changed

**Timestamp:** 2026-04-04

## Narrative
### Structure
UI actions defined in src/ui/actions.ts with namespace prefixes (ABOUT_DIALOG_*, MENU_BAR_*, SIDE_BAR_*, WEBVIEW_*, SETTINGS_*, etc.). Selectors in src/ui/selectors.ts use createSelector from reselect for memoization. Type system uses UiActionTypeToPayloadMap for compile-time safety.

### Dependencies
Depends on reselect createSelector for memoization. Imports Server type from servers/common and RootState from store/rootReducer.

### Highlights
selectGlobalBadge memoizes across all servers using createSelector. selectGlobalBadgeText and selectGlobalBadgeCount provide derived badge formats. Actions follow FSA pattern with explicit type and payload fields.

### Rules
Rule 1: All UI actions must follow FSA pattern with {type, payload}
Rule 2: Selectors must use createSelector for memoization to prevent unnecessary re-renders
Rule 3: Action types use namespace prefixes separated by underscore (e.g., MENU_BAR_ABOUT_CLICKED)

### Examples
selectGlobalBadge usage: const badge = selectGlobalBadge(state); // returns number | "•" | undefined
