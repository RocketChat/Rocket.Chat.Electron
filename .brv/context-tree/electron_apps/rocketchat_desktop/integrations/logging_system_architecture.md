---
title: Logging System Architecture
tags: []
related: [electron_apps/rocketchat_desktop/integrations/screen_sharing_ipc_channels.md, electron_apps/rocketchat_desktop/configuration/auto_update_system.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:15:56.287Z'
updatedAt: '2026-04-04T18:15:56.287Z'
---
## Raw Concept
**Task:**
Multi-process, context-aware, privacy-filtering log pipeline for Rocket.Chat Electron

**Changes:**
- Overrides console methods with electron-log context tags
- Implements IPC rate-limiting (100 msgs/sec per webContents)
- Installs privacy hooks for redaction of secrets and PII
- Detects component context from stack inspection

**Files:**
- src/logging/index.ts
- src/logging/context.ts
- src/logging/scopes.ts
- src/logging/privacy.ts
- src/logging/dedup.ts
- src/logging/cleanup.ts
- src/logging/fallback.ts
- src/logging/preload.ts

**Flow:**
Console call → electron-log → context enrichment → privacy redaction → deduplication → file/IPC transport

**Timestamp:** 2026-04-04

**Patterns:**
- `/\b\d{4,}\b/g` - Matches 4+ digit numbers for normalization in deduplication
- `/\b\d+\.\d+\b/g` - Matches decimal numbers for normalization in deduplication
- `^Bearer\s+[A-Za-z0-9-._~+/]+=*$` - Validates Bearer token format for privacy redaction
- `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b` - Email pattern for PII redaction (2+ char local part, excludes npm scopes)
- `\b(?:\d{4}[\s-]?){3}\d{4}\b` - Credit card pattern (13-19 digits, Luhn validated)

## Narrative
### Structure
Multi-process logging with main process (index.ts) coordinating console overrides, context enrichment, privacy hooks, and transport management. Renderer processes (preload.ts) send logs via IPC. Component context detection uses stack inspection with keyword matching. Privacy redaction is field-based and pattern-based.

### Dependencies
Depends on electron-log for transport, Redux state detection for automatic redaction, Error().stack for component identification. Requires ipcMain/ipcRenderer for cross-process communication.

### Highlights
IPC rate-limiting prevents log flooding from compromised webviews. Privacy redaction masks credentials while preserving diagnostics. LogDeduplicator normalizes dynamic values (numbers, decimals) to reduce log spam. Cross-process log correlation via standardized format. Redux state detection (3+ signature keys) automatically redacts sensitive state. File transport async writes with 10MB rotation. Error JSONL logging with 5MB limit and 10s flush interval.

### Rules
Rule 1: All console.* calls in renderer processes must go through IPC to main process
Rule 2: IPC messages are rate-limited to 100/second per webContents
Rule 3: Errors always pass deduplication (never skipped)
Rule 4: Log file permissions must be 0600 (owner-only)
Rule 5: Privacy hook must not throw (falls back to "[Privacy redaction failed]")
Rule 6: Component context detection requires 3+ signature keys for Redux state redaction
Rule 7: Development uses "debug" level, Production uses "info" level

### Examples
Example log format: "[main] [auth] Login attempt for user@example.com". Example privacy masking: "eyJhbG...xK9s" (Bearer token). Example component detection: "auth" detected from "login" in stack. Example Redux detection: apppath, appversion, servers, clientcertificates detected → redacts as "[Redux State Redacted]".

## Facts
- **logging_foundation**: Logging system is built on electron-log [project]
- **ipc_rate_limit**: IPC rate-limit is 100 messages/second per webContents [project]
- **file_transport_size**: File transport max size is 10MB with async writes [project]
- **error_logging_config**: Error JSONL logging max is 5MB with 10s flush interval [project]
- **log_file_permissions**: Log file permissions are 0600 (owner-only) [project]
- **log_format**: Log format: [processType] [server?] [component?] [project]
- **component_detection**: Component detection uses Error().stack inspection for keywords [project]
- **log_levels**: Development log level is 'debug', Production is 'info' [project]
- **privacy_masking**: Privacy redaction masks tokens preserving first/last 4 chars [project]
- **redux_detection**: Redux state detection uses 3+ signature keys for redaction [project]
