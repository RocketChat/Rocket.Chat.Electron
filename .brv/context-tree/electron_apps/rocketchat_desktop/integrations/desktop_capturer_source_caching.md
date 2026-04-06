---
title: Desktop Capturer Source Caching
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:13:18.151Z'
updatedAt: '2026-04-04T18:13:18.151Z'
---
## Raw Concept
**Task:**
Cache desktop capturer sources with stale detection, thumbnail validation, and background refresh

**Changes:**
- Implemented background cache for desktopCapturer.getSources()
- Added stale detection with 3-second threshold
- Implemented thumbnail validation to filter out invalid sources
- Added source validation cache with 30-second TTL
- Implemented cache-first strategy for desktop-capturer-get-sources IPC channel

**Files:**
- src/screenSharing/desktopCapturerCache.ts

**Flow:**
prewarmDesktopCapturerCache() → refreshDesktopCapturerCache() → desktopCapturer.getSources() → filter invalid sources (empty name, empty thumbnail) → validate against sourceValidationCache → store in desktopCapturerCache with timestamp → on IPC request: check if cached and not stale (>3000ms) → return cached sources or fetch fresh

**Timestamp:** 2026-04-04

**Patterns:**
- `^DESKTOP_CAPTURER_STALE_THRESHOLD = 3000$` - Cache invalidation threshold in milliseconds
- `^SOURCE_VALIDATION_CACHE_TTL = 30000$` - Source validation cache TTL in milliseconds

## Narrative
### Structure
Desktop capturer cache in desktopCapturerCache.ts maintains: (1) desktopCapturerCache object storing sources array and timestamp, (2) desktopCapturerPromise for in-flight refresh operations, (3) sourceValidationCache Set tracking validated source IDs, (4) sourceValidationCacheTimestamp for cache expiration. refreshDesktopCapturerCache() calls desktopCapturer.getSources(), filters out sources with empty name or empty thumbnail, validates against sourceValidationCache (expires every 30 seconds), stores result with timestamp. prewarmDesktopCapturerCache() triggers refresh with {types: ['window', 'screen']}. handleDesktopCapturerGetSources() implements cache-first strategy: returns cached sources if not stale (< 3000ms old), triggers refresh if stale, waits for in-flight refresh if pending.

### Dependencies
Requires Electron desktopCapturer API, IPC handler registration via handle() function, timestamp-based cache invalidation logic.

### Highlights
STALE_THRESHOLD=3000ms ensures sources are refreshed frequently for accuracy. SOURCE_VALIDATION_CACHE_TTL=30000ms prevents repeated thumbnail validation. Filters sources with empty names or empty thumbnails (invalid for display). In-flight refresh prevented by desktopCapturerPromise check. Cache-first strategy reduces repeated desktopCapturer.getSources() calls. Handles errors gracefully by returning last known good cache or empty array.
