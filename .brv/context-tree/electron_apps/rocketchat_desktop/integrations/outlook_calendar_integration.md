---
title: Outlook Calendar Integration
tags: []
related: [electron_apps/rocketchat_desktop/project_overview.md, electron_apps/rocketchat_desktop/main_process_lifecycle.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:09:08.233Z'
updatedAt: '2026-04-04T18:09:08.233Z'
---
## Raw Concept
**Task:**
Integrate Microsoft Outlook calendar with Rocket.Chat Desktop app to sync appointments

**Changes:**
- Implemented EWS-based calendar sync
- Added credential encryption via Electron safeStorage
- Sync coalescing to prevent concurrent requests
- Support for air-gapped Exchange servers

**Files:**
- src/outlookCalendar/getOutlookEvents.ts
- src/outlookCalendar/ipc.ts
- src/outlookCalendar/actions.ts
- src/outlookCalendar/type.ts
- src/outlookCalendar/errorClassification.ts
- src/outlookCalendar/logger.ts

**Flow:**
Credentials requested → EWS connection → Fetch Outlook events → Sync with Rocket.Chat → Recurring sync every 60min

**Timestamp:** 2026-04-04

**Patterns:**
- `^[A-Za-z0-9+/]+=*$` - Detects base64-encoded encrypted credentials for decryption fallback

## Narrative
### Structure
Outlook integration lives in src/outlookCalendar/ with 6 core modules: EWS sync engine (getOutlookEvents.ts), IPC handler (ipc.ts), FSA actions, type definitions, error classification, and logging. Main process manages per-server sync state via serverSyncStates Map.

### Dependencies
Requires ews-javascript-api and @ewsjs/xhr npm packages for EWS communication. Uses axios for Rocket.Chat REST API calls. Electron safeStorage for credential encryption. Compatible with Rocket.Chat 7.5.0+ for endTime/busy fields.

### Highlights
Sync coalescing prevents concurrent requests—queues subsequent syncs when one is in progress, executing only the last queued sync with most recent state. Duplicate detection by externalId keeps first occurrence. Supports insecure connections for air-gapped environments via allowInsecureOutlookConnections setting. Credentials encrypted when safeStorage available, with plaintext fallback for legacy credentials.

### Rules
Rule 1: Default sync interval is 60 minutes, configurable via UI settings or overridden via overridden-settings.json
Rule 2: Credential encryption uses Electron safeStorage when available; plaintext fallback for legacy
Rule 3: Sync coalescing: queue subsequent requests when sync in progress; only last queued sync executes
Rule 4: Minimum Rocket.Chat version 7.5.0 required for endTime/busy fields in payloads
Rule 5: Verbose logging controlled by global.isVerboseOutlookLoggingEnabled flag; outlookError always logs

### Examples
URL sanitization: https://mail.example.com → https://mail.example.com/ews/exchange.asmx. Event sync detects changes by comparing externalId and updates via POST /api/v1/calendar.events/update. Recurring sync via setInterval with debounce restart (10s) on interval change.

## Facts
- **calendar_integration_library**: Uses EWS (Exchange Web Services) via ews-javascript-api and @ewsjs/xhr npm packages [project]
- **calendar_sync_target**: Syncs calendar events with Microsoft Exchange servers [project]
- **sync_interval_default**: Default sync interval is 60 minutes [project]
- **initial_sync_debounce**: Initial sync debounce is 100ms [project]
- **axios_timeout**: Axios timeout for Rocket.Chat API is 10,000ms [project]
- **credential_encryption**: Credentials are encrypted via Electron safeStorage when available [project]
- **insecure_connections**: Supports air-gapped environments via allowInsecureOutlookConnections setting [project]
- **min_rc_version**: Minimum Rocket.Chat server version for endTime/busy fields is 7.5.0 [project]
- **rocket_chat_api_endpoints**: REST API endpoints: GET /api/v1/calendar.events, POST /api/v1/calendar.events/import, POST /api/v1/calendar.events/update, POST /api/v1/calendar.events/delete [project]
