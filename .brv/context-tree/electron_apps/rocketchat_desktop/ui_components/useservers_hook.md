---
title: useServers Hook
tags: []
related: [electron_apps/rocketchat_desktop/ui_components/serversview_and_serverpane_components.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:11:37.964Z'
updatedAt: '2026-04-04T18:11:59.456Z'
---
## Raw Concept
**Task:**
Memoized Redux selector hook that combines currentView and servers state to provide server list with selection status

**Files:**
- src/ui/components/hooks/useServers.ts

**Flow:**
Redux state (currentView, servers) → reselect memoization → map servers with selected flag → return to React component

**Timestamp:** 2026-04-04

**Patterns:**
- `currentViewUrl && currentViewUrl.href === new URL(server.url).href` - URL comparison pattern using href property for exact matching

## Narrative
### Structure
Hook implemented using useSelector + reselect createSelector. Combines two Redux state selectors (currentView, servers) into a single memoized selector that enriches each server with a selected boolean flag.

### Dependencies
Depends on react-redux (useSelector), reselect (createSelector), Server type from servers/common, RootState type from store/rootReducer

### Highlights
Primary data bridge from Redux to React for server list. Memoization prevents unnecessary re-renders. URL-based matching handles both string and object currentView formats. TODO: improve type safety by changing currentView.url from string to URL type.

### Rules
Rule 1: currentView is either "add-new-server" string or {url: string} object
Rule 2: Server selection determined by URL href comparison
Rule 3: Returns array of Server objects with added selected boolean property

### Examples
Usage: const servers = useServers(); // Returns [{ url, selected: true }, { url, selected: false }, ...]

## Facts
- **useservers_hook_purpose**: useServers hook creates a memoized selector via reselect that combines currentView and servers from Redux state [project]
- **file_location**: useServers is located in src/ui/components/hooks/useServers.ts [project]
- **return_type**: useServers returns array of Server objects with selected boolean flag [project]
- **current_view_type**: currentView from Redux state is either 'add-new-server' string or {url: string} object [project]
- **selection_logic**: Server selection is determined by comparing currentView.url with server.url using URL href property [project]
- **dependencies**: Hook uses react-redux and reselect for memoization and state selection [project]
- **type_safety_improvement**: TODO: change currentView.url string to URL type for better type safety [project]
- **data_bridge_pattern**: Hook serves as primary data bridge from Redux to React for the server list [project]
