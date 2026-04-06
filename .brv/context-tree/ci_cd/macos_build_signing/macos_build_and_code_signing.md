---
title: macOS Build and Code Signing
tags: []
keywords: []
importance: 60
recency: 1
maturity: draft
updateCount: 2
createdAt: '2026-04-04T18:48:50.823Z'
updatedAt: '2026-04-04T18:53:28.562Z'
---
## Raw Concept
**Task:**
Configure macOS build process with code signing and notarization for Electron app

**Changes:**
- disableSpotlightIndexing function prevents DMG generation errors
- packOnMacOS function handles electron-builder invocation with signing and notarization
- Universal binary support for both Intel and Apple Silicon architectures

**Files:**
- workspaces/desktop-release-action/src/macos.ts

**Flow:**
Disable Spotlight indexing -> Configure code signing credentials -> Build universal binary (Intel+Apple Silicon) -> Notarize app via Apple notarytool

**Patterns:**
- `^sudo mdutil -a -i off$` - Command to disable Spotlight indexing on macOS to prevent DMG generation errors

## Narrative
### Structure
Two main functions in src/macos.ts: disableSpotlightIndexing() and packOnMacOS(). The disable function runs as a grouped action in GitHub Actions. The pack function delegates to runElectronBuilder with environment variables for signing credentials.

### Dependencies
@actions/core for GitHub Actions integration, electron-builder for packaging and notarization, Apple notarytool for app notarization

### Highlights
Supports universal binary builds (--mac --universal) for both Intel and Apple Silicon. Notarization is enforced via FORCE_NOTARIZE=true. Requires CSC_LINK (base64-encoded p12 certificate), CSC_KEY_PASSWORD, APPLEID, APPLEIDPASS, and ASC_PROVIDER credentials.

### Rules
Rule 1: Spotlight indexing must be disabled before DMG generation to avoid errors
Rule 2: FORCE_NOTARIZE must be set to true for production builds
Rule 3: All signing credentials must be provided via GitHub Actions inputs

### Examples
CSC_LINK contains base64-encoded PKCS#12 certificate. ASC_PROVIDER is the Apple team identifier for notarization. APPLEID and APPLEIDPASS authenticate with Apple ID for notarization service.

## Facts
- **spotlight_indexing**: disableSpotlightIndexing runs sudo mdutil -a -i off [project]
- **universal_binary**: packOnMacOS calls electron-builder with --mac --universal flags [project]
- **notarization_enforced**: FORCE_NOTARIZE is set to true for macOS builds [convention]
- **code_signing_certificate**: CSC_LINK contains base64-encoded p12 certificate [environment]
- **notarization_tool**: electron-builder handles notarization via Apple notarytool [project]
