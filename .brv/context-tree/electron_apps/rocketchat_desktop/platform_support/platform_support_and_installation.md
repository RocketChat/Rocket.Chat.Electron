---
title: Platform Support and Installation
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:06:23.179Z'
updatedAt: '2026-04-04T18:06:23.179Z'
---
## Raw Concept
**Task:**
Document supported platforms, architectures, and installation formats

**Changes:**
- Windows 10+ with x64, ia32, arm64 architectures
- macOS 12+ with Universal (x64 + Apple Silicon)
- Linux Ubuntu 22.04+ with x64 architecture

**Files:**
- README.md

**Flow:**
Platform detection -> Select appropriate installer -> Execute platform-specific installation -> Configure post-install

**Timestamp:** 2026-04-04

**Patterns:**
- `/S` - Windows silent install flag
- `/allusers` - Windows install for all users (requires admin)
- `/currentuser` - Windows install for current user only (default)
- `/disableAutoUpdates` - Windows disable automatic updates flag

## Narrative
### Structure
Cross-platform support with platform-specific installers and formats. Windows uses NSIS or MSI, macOS uses DMG/PKG/ZIP, Linux uses AppImage/deb/rpm/snap/tar.gz. Each platform has minimum OS version and supported architectures.

### Dependencies
Platform requirements: Windows 10 minimum, macOS 12 (Monterey) minimum, Linux Ubuntu 22.04 or equivalent. macOS requires Universal binary for both Intel and Apple Silicon.

### Highlights
Windows supports silent installation with /S flag and per-user or all-users installation. macOS provides multiple package formats for different installation methods. Linux supports multiple package managers and portable formats. Download available from Releases page and app stores.

### Rules
Rule 1: Windows silent install: add /S flag
Rule 2: Windows all-users install requires admin privileges
Rule 3: macOS Universal binary supports both x64 and Apple Silicon
Rule 4: Linux x64 only, Ubuntu 22.04+ or equivalent
Rule 5: App stores: Microsoft Store (Windows), Mac App Store (macOS), Snap Store (Linux)
