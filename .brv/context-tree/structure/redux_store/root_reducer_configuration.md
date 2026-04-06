---
title: Root Reducer Configuration
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:25:19.828Z'
updatedAt: '2026-04-04T18:25:19.828Z'
---
## Raw Concept
**Task:**
Document Redux RootState shape and reducer slice organization

**Files:**
- src/store/rootReducer.ts

**Flow:**
combineReducers -> RootState type definition with 50+ reducer slices grouped by domain

**Timestamp:** 2026-04-04

## Narrative
### Structure
RootState is created via combineReducers() in src/store/rootReducer.ts. Approximately 50 reducer slices are imported from domain-specific reducer files and combined into a single RootState object. The reducers are organized by functional domain: app core settings, server management, navigation/security, downloads, updates, UI flags, window state, video calls, Outlook integration, and other features.

### Dependencies
Uses Redux combineReducers utility. Imports individual reducer functions from domain-specific reducer files.

### Highlights
RootState = ReturnType<typeof rootReducer> provides TypeScript type safety for the entire state tree. Reducer slices are distributed across multiple modules (app, downloads, jitsi, navigation, servers, ui, updates, outlookCalendar) to maintain separation of concerns.
