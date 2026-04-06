---
title: URL Constants Module
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:23:37.425Z'
updatedAt: '2026-04-04T18:23:37.425Z'
---
## Raw Concept
**Task:**
Centralized URL constants module for all external URLs used in the Rocket.Chat Electron app

**Changes:**
- Centralized all external URLs in single module
- Implemented typed URL builders using generics
- Provides subdomain builder for Rocket.Chat services
- Includes calendar events REST API endpoints
- Documentation URLs for supported versions and issue reporting

**Files:**
- src/urls.ts

**Flow:**
URL builders for different services -> typed constants -> app-wide usage

**Timestamp:** 2026-04-04

## Narrative
### Structure
src/urls.ts exports const-typed URL builders and constants. Main exports: rocketchat (site + subdomain builder), open, supportedVersions, server, and docs. All URLs are const-typed with "as const" for literal type inference.

### Highlights
Supports dynamic server URL building with typed API endpoints. Calendar integration endpoints (list, import, update, delete). Public settings API for uniqueID and custom settings queries. Documentation and issue tracking URLs.

### Rules
Rule 1: All URLs exported as const with "as const" type assertion for literal type inference
Rule 2: server() builder is generic, accepts serverUrl type parameter
Rule 3: supportedVersions requires domain and uniqueId parameters
Rule 4: All calendar event endpoints require serverUrl context

### Examples
Example 1: rocketchat.subdomain("open") returns "https://open.rocket.chat"
Example 2: server("https://example.com/").uniqueId returns "https://example.com/api/v1/settings.public?_id=uniqueID"
Example 3: supportedVersions({domain: "example.com", uniqueId: "xyz"}) builds releases URL with query params
