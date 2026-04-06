---
children_hash: c77ae7d20b4c49654e91971cef6b14635af12c629b7cc637edfcaa0ad272d94c
compression_ratio: 0.6983471074380165
condensation_order: 0
covers: [platform_support_and_installation.md]
covers_token_total: 484
summary_level: d0
token_count: 338
type: summary
---
# Platform Support and Installation

## Overview
Rocket.Chat Electron supports Windows 10+, macOS 12+, and Linux Ubuntu 22.04+ with platform-specific installers and installation methods.

## Supported Platforms & Architectures

| Platform | Minimum Version | Architectures | Formats |
|----------|-----------------|----------------|---------|
| Windows | 10+ | x64, ia32, arm64 | NSIS, MSI |
| macOS | 12 (Monterey)+ | Universal (x64 + Apple Silicon) | DMG, PKG, ZIP |
| Linux | Ubuntu 22.04+ | x64 | AppImage, deb, rpm, snap, tar.gz |

## Installation Methods

**Windows:**
- Silent install: `/S` flag
- Per-user (default): `/currentuser`
- All-users (admin required): `/allusers`
- Disable auto-updates: `/disableAutoUpdates`

**macOS:**
- Multiple package formats for different installation workflows
- Universal binary handles both Intel and Apple Silicon

**Linux:**
- Multiple package managers (apt, snap, rpm)
- Portable formats (AppImage, tar.gz)

**Distribution Channels:**
- Direct downloads from Releases page
- Microsoft Store (Windows)
- Mac App Store (macOS)
- Snap Store (Linux)

## Installation Flow
Platform detection → Select appropriate installer → Execute platform-specific installation → Configure post-install

See **platform_support_and_installation.md** for detailed installation procedures and platform-specific requirements.