---
title: Installation
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:05:17.526Z'
updatedAt: '2026-04-04T18:05:17.526Z'
---
## Raw Concept
**Task:**
Document installation process and options for different platforms

**Changes:**
- Windows supports silent install with /S flag
- Installation flags for Windows: /allusers, /currentuser, /disableAutoUpdates
- Installers available from Releases page and app stores

**Timestamp:** 2026-04-04

## Narrative
### Structure
Installation varies by platform. Windows uses NSIS/MSI installers with optional flags. macOS offers DMG/PKG/ZIP. Linux provides AppImage, deb, rpm, snap, and tar.gz formats. Pre-release and post-install configuration supported.

### Highlights
Installers available from GitHub Releases, Microsoft Store, Mac App Store, and Snap Store. Windows supports silent installation for enterprise deployment.

### Rules
Windows silent install flag: /S
Windows all users installation: /allusers (requires admin)
Windows current user installation: /currentuser (default)
Windows disable auto-updates: /disableAutoUpdates
servers.json only checked if no servers already added
Overridden settings require user preferences folder location
