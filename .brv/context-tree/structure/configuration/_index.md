---
children_hash: 2b1df9de77d09b62557ec4c570cf088874a2fd9c22a02bfc902ed6c87757b682
compression_ratio: 0.7518656716417911
condensation_order: 1
covers: [context.md, url_constants_module.md]
covers_token_total: 536
summary_level: d1
token_count: 403
type: summary
---
# Configuration Domain Summary

## Overview
The configuration domain manages URL constants and builders for all external service endpoints used throughout the Rocket.Chat Electron application. It provides centralized, typed URL generation for API endpoints, calendar integration, documentation, and settings queries.

## Architecture

**Core Module:** `src/urls.ts`
- Exports const-typed URL builders and constants using "as const" for literal type inference
- Implements generic typed URL builders for dynamic endpoint construction
- Centralizes all external URL definitions in a single module

## Key Components

**URL Builders:**
- `rocketchat` - Site and subdomain builder (e.g., "https://open.rocket.chat")
- `server(serverUrl)` - Generic builder for server-specific API endpoints
- `supportedVersions({domain, uniqueId})` - Releases URL with query parameters
- `open` - Direct constant exports
- `docs` - Documentation and issue tracking URLs

**API Endpoints:**
- Calendar events: list, import, update, delete operations
- Public settings API: uniqueID and custom settings queries
- Server-relative endpoints: `/api/v1/settings.public`

## Design Patterns

**Type Safety:**
- All URLs exported with "as const" assertion for literal type inference
- Generic type parameters for server-specific builders
- Typed API endpoint definitions

**Subdomain Construction:**
- Dynamic subdomain builder for Rocket.Chat services
- Supports parameterized URL generation with context (serverUrl, domain, uniqueId)

## Related Entries
- **url_constants_module.md** - Detailed implementation and endpoint specifications