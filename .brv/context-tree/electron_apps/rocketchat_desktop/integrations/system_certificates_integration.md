---
title: System Certificates Integration
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:20:41.052Z'
updatedAt: '2026-04-04T18:20:41.052Z'
---
## Raw Concept
**Task:**
Load OS trust store CA certificates into Node.js TLS at application startup

**Changes:**
- Loads system CA certificates before app.whenReady()
- Merges OS certificates with bundled Node.js CAs
- Reads useSystemCertificates setting from overridden-settings.json

**Files:**
- src/systemCertificates.ts
- src/main.ts

**Flow:**
app start -> readUseSystemCertificatesSetting() -> tls.getCACertificates('system') -> merge with bundled -> tls.setDefaultCACertificates() -> track status

**Timestamp:** 2026-04-04

**Patterns:**
- `useSystemCertificates(?:'|")?\s*(?::|=)\s*(?:true|false)` (flags: i) - Validates useSystemCertificates setting in JSON config files

## Narrative
### Structure
applySystemCertificates() is the main entry point called in main.ts start() before app.whenReady(). It reads configuration, retrieves OS certificates, merges them with bundled certificates, and tracks application status.

### Dependencies
Requires Node.js tls module, Electron app module, file system access to userData and appPath directories. Handles both .asar packaged and unpacked app distributions.

### Highlights
Default behavior is enabled. Supports disabling via overridden-settings.json in two priority locations: userData (user-specific) and appPath (app-default). Gracefully handles missing OS certificates and configuration file errors.

### Rules
Rule 1: applySystemCertificates() must be called before app.whenReady() to ensure custom enterprise CAs are available for all subsequent network calls
Rule 2: useSystemCertificates setting defaults to enabled (true)
Rule 3: Priority order for settings: userData/overridden-settings.json (highest) → appPath/overridden-settings.json (lowest)
Rule 4: Handles both .asar and unpacked app distributions when resolving appPath

### Examples
Example status object: {applied: true, certCount: 42, error?: undefined}
Example disabled config: {"useSystemCertificates": false}
Example error handling: If no system certificates found, logs info message and continues with bundled CAs only
