---
title: Video Call Window Display Media and Screen Sharing
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:45:28.665Z'
updatedAt: '2026-04-04T18:45:28.665Z'
---
## Raw Concept
**Task:**
Document display media handler and screen picker integration for screen sharing

**Changes:**
- Display media handler with custom source picker
- Screen picker provider abstraction
- Error handling for display media requests

**Files:**
- src/videoCallWindow/ipc.ts

**Flow:**
Webview attached -> did-attach-webview event -> async load screenPicker module -> setup display media handler -> provider.handleDisplayMediaRequest -> custom picker callback -> send open-screen-picker IPC -> relay response via screen-sharing-source-responded

**Timestamp:** 2026-04-04

## Narrative
### Structure
Display media handler configured with useSystemPicker: false, always using custom source selection. Screen picker providers created via createScreenPicker() function. InternalPickerProvider uses createInternalPickerHandler callback to trigger UI and relay responses.

### Dependencies
Requires screenSharing/screenPicker module, display media API support, screen picker provider implementation. On Linux uses PipeWire/XDG portal.

### Highlights
Custom screen picker UI prevents system picker from blocking custom UI. Error handling catches display media errors and returns {video: false}. Pending webviews queue handlers until screen picker ready. Sync listener on did-attach-webview with async module loading.

### Rules
Rule 1: useSystemPicker must be false (custom picker always)
Rule 2: Display media handler catches errors and returns {video: false}
Rule 3: Pending webviews handled asynchronously after screen picker ready
