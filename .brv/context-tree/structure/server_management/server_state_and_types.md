---
title: Server State and Types
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:16:26.070Z'
updatedAt: '2026-04-04T18:16:26.070Z'
---
## Raw Concept
**Task:**
Define server state shape and resolution result types

**Files:**
- src/servers/common.ts

**Flow:**
Server type defines all properties including URL, title, version, login state, supported versions, etc.

## Narrative
### Structure
Server type in src/servers/common.ts contains 20+ optional properties. Core required fields: url (string). Optional fields include: title, pageTitle, badge, favicon, style, customTheme, lastPath, failed, webContentsId, userLoggedIn, gitCommitHash, allowedRedirects, outlookCredentials, version, uniqueID, isSupportedVersion, supportedVersionsSource, supportedVersions, supportedVersionsFetchState, expirationMessageLastTimeShown, supportedVersionsValidatedAt, documentViewerOpenUrl, documentViewerFormat.

### Dependencies
Server type depends on OutlookCredentials and SupportedVersions types. ServerUrlResolutionStatus enum defines resolution outcomes: OK, INVALID_URL, TIMEOUT, INVALID.

### Highlights
ServerUrlResolutionResult is tuple type with 2 variants: [url, OK] for success or [url, status, error] for failures. isServerUrlResolutionResult() validates both tuple formats.

### Examples
Success: [resolvedServerUrl, ServerUrlResolutionStatus.OK]. Failure: [url, ServerUrlResolutionStatus.TIMEOUT, error]
