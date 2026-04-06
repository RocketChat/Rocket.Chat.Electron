---
title: Server URL Resolution System
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:31:19.340Z'
updatedAt: '2026-04-04T18:31:19.340Z'
---
## Raw Concept
**Task:**
Implement server URL resolution with normalization, validation, and version checking

**Changes:**
- Added convertToURL() for URL normalization
- Added resolveServerUrl() for server validation and version checking
- Added server loading from app and user paths
- Added localStorage-based server persistence

**Files:**
- src/servers/main.ts

**Flow:**
User input → convertToURL() → resolveServerUrl() → version validation → SERVER_URL_RESOLVED action → servers reducer

**Timestamp:** 2026-04-04

**Patterns:**
- `^https?://` - Protocol validation for server URLs
- `>=2.0.0` - Minimum required server version

## Narrative
### Structure
URL resolution happens in src/servers/main.ts with two main functions: convertToURL() normalizes input (handles both https://example.com and example.com formats), resolveServerUrl() validates format, fetches server info via IPC, and validates version.

### Dependencies
Requires server version >=2.0.0 (REQUIRED_SERVER_VERSION_RANGE). Falls back to rocketchat.subdomain() if input lacks protocol/domain. Reads servers.json from app path or /Library/Preferences/{productName}/servers.json (macOS).

### Highlights
Supports multiple URL formats (with/without protocol). Removes default ports (80 for http, 443 for https). Ensures pathname ends with /. Returns status codes: INVALID_URL, TIMEOUT, INVALID, OK.

### Rules
Rule 1: convertToURL must normalize protocol, username, password, hostname, port, pathname
Rule 2: resolveServerUrl must validate server version against >=2.0.0
Rule 3: Default ports 80 (http) and 443 (https) must be removed
Rule 4: Pathname must end with /
