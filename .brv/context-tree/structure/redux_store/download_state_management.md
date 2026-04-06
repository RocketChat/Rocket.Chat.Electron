---
title: Download State Management
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:17:59.428Z'
updatedAt: '2026-04-04T18:17:59.428Z'
---
## Raw Concept
**Task:**
Manage download state in Redux store with action types and reducer logic

**Files:**
- src/downloads/actions.ts
- src/downloads/reducers/downloads.ts

**Flow:**
DOWNLOAD_CREATED -> state addition | DOWNLOAD_UPDATED -> partial merge | DOWNLOAD_REMOVED -> deletion | DOWNLOADS_CLEARED -> full reset | APP_SETTINGS_LOADED -> rehydration with state cleanup

**Timestamp:** 2026-04-04

## Narrative
### Structure
Downloads state is Record<Download["itemId"], Download> keyed by numeric itemId. Action types: DOWNLOAD_CREATED (payload: Download), DOWNLOAD_UPDATED (payload: {itemId, ...partial}), DOWNLOAD_REMOVED (payload: itemId), DOWNLOADS_CLEARED (payload: void). APP_SETTINGS_LOADED rehydrates downloads from persisted state.

### Dependencies
Redux store dispatch/select, Download type from common.ts, DownloadStatus enum

### Highlights
Reducer handles state cleanup on APP_SETTINGS_LOADED: any download in "progressing" or "paused" state is transitioned to "cancelled" with status set to CANCELLED. DOWNLOAD_UPDATED uses shallow merge to preserve existing download properties while applying partial updates.

### Rules
Rule 1: DOWNLOAD_CREATED adds new download to state using itemId as key
Rule 2: DOWNLOAD_UPDATED only applies if download exists (returns unchanged state if not found)
Rule 3: DOWNLOAD_REMOVED deletes entry from state
Rule 4: DOWNLOADS_CLEARED returns empty object ({})
Rule 5: APP_SETTINGS_LOADED initializes state from persisted data, cancelling any in-progress downloads
