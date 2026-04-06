---
title: Root Window Icon and Server Info Management
tags: []
related: [electron_apps/rocketchat_desktop/integrations/ipc_renderer_process_implementation.md, structure/redux_store/redux_store_architecture.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:34:47.760Z'
updatedAt: '2026-04-04T18:34:47.760Z'
---
## Raw Concept
**Task:**
Manage root window icon updates with badges and favicons, and fetch server version information for validation

**Changes:**
- Watches Redux state for badge and favicon changes
- Renders Badge React component to SVG
- Composites favicon and badge into canvas image
- Platform-specific handling: overlayImage on Windows, full icon on Linux
- Fetches /api/info endpoint for server version validation

**Files:**
- src/servers/renderer.ts

**Flow:**
Redux state watch -> selectBadgeAndFavicon -> platform-specific icon rendering -> canvas composition -> dispatch ROOT_WINDOW_ICON_CHANGED

## Narrative
### Structure
Two main functions: fetchInfo() for server validation via API, and default export that sets up Redux watchers for icon updates. Platform detection uses process.platform to route to Linux or Windows handlers.

### Dependencies
Requires Redux store (dispatch, watch), React (createElement, renderToStaticMarkup), reselect (createStructuredSelector), IPC handler registration

### Highlights
Implements badge aggregation logic: sums numeric badges, shows bullet point if any badge exists. Supports multiple icon sizes (16-256px). Uses canvas 2D context for image composition. Handles image loading with Promise-based async API.

### Rules
Rule 1: fetchInfo() extracts username/password from URL and sends Basic auth header
Rule 2: Badge selection priority: numeric count > bullet indicator > undefined
Rule 3: Linux renders full icon with badge clipped to bottom-right corner
Rule 4: Windows renders favicon at multiple sizes plus optional overlay badge at 32px
Rule 5: Favicon image is cached and reused across updates

### Examples
Example: fetchInfo("https://user:pass@example.com") -> fetches /api/info -> returns [normalized URL, version string]. Example badge aggregation: [5, null, 3] -> 8 mentions; [null, null, null] -> undefined; [null, null, true] -> "•"
