---
title: Server URL Resolution
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:16:26.068Z'
updatedAt: '2026-04-04T18:16:26.068Z'
---
## Raw Concept
**Task:**
Implement server URL resolution with validation and version checking

**Changes:**
- convertToURL() normalizes URLs with protocol/port defaults
- resolveServerUrl() validates URLs and fetches server info
- fetchServerInformation() retrieves server version via IPC
- Supports subdomain fallback for incomplete URLs

**Files:**
- src/servers/main.ts
- src/servers/common.ts

**Flow:**
URL input -> convertToURL -> fetchServerInformation -> version validation -> ServerUrlResolutionStatus

**Timestamp:** 2026-04-04

## Narrative
### Structure
URL resolution in src/servers/main.ts. convertToURL() normalizes input to URL object with defaults: http port 80, https port 443, trailing slash on pathname. resolveServerUrl() wraps fetching and validation.

### Dependencies
Uses semver for version validation (>= 2.0.0 required). Depends on getRootWindow() for webContents and invoke() for IPC communication. Falls back to subdomain resolution for incomplete URLs.

### Highlights
Handles multiple error cases (INVALID_URL, TIMEOUT, INVALID, version mismatch). AbortError triggers TIMEOUT status. Subdomain fallback attempts resolution via urls.rocketchat.subdomain().

### Rules
Rule 1: Required server version range is >=2.0.0
Rule 2: HTTP default port is 80, HTTPS default port is 443
Rule 3: Pathname always ends with /
Rule 4: Incomplete URLs without protocol/domain trigger subdomain fallback
