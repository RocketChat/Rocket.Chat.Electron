---
children_hash: 85eef494f0e4d348c0c0c563cbd2d2c3d186d4d00888983715b6f68a7526bf6b
compression_ratio: 0.5829846582984658
condensation_order: 1
covers: [context.md, macos_build_and_code_signing.md]
covers_token_total: 717
summary_level: d1
token_count: 418
type: summary
---
# macOS Build and Code Signing

## Overview
Handles macOS-specific build configuration, code signing, and Apple notarization for secure Electron app distribution on both Intel and Apple Silicon architectures.

## Architecture

**Core Components** (src/macos.ts):
- `disableSpotlightIndexing()` - Prevents DMG generation errors via `sudo mdutil -a -i off`
- `packOnMacOS()` - Orchestrates electron-builder invocation with signing and notarization

**Build Flow:**
Disable Spotlight indexing → Configure code signing credentials → Build universal binary (Intel + Apple Silicon) → Notarize via Apple notarytool

## Key Decisions

| Aspect | Implementation |
|--------|-----------------|
| **Binary Support** | Universal binary builds with `--mac --universal` flags |
| **Notarization** | Enforced via `FORCE_NOTARIZE=true` for production |
| **Signing Tool** | electron-builder delegates to Apple notarytool |
| **Credential Format** | CSC_LINK as base64-encoded PKCS#12 certificate |

## Required Credentials

- `CSC_LINK` - Base64-encoded p12 certificate
- `CSC_KEY_PASSWORD` - Certificate password
- `APPLEID` / `APPLEIDPASS` - Apple ID authentication
- `ASC_PROVIDER` - Apple team identifier for notarization

## Critical Rules

1. Spotlight indexing must be disabled before DMG generation
2. FORCE_NOTARIZE must be enabled for production builds
3. All signing credentials must be provided via GitHub Actions inputs

## Dependencies

- @actions/core (GitHub Actions integration)
- electron-builder (packaging and notarization)
- Apple notarytool (app notarization service)

See **macos_build_and_code_signing.md** for implementation details and credential configuration.