---
title: Linux Build and Snapcraft Publishing
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:53:07.682Z'
updatedAt: '2026-04-04T18:53:07.682Z'
---
## Raw Concept
**Task:**
Implement Linux build pipeline with snapcraft installation and cumulative channel promotion for snap releases

**Changes:**
- setupSnapcraft installs snapcraft via snap with stable channel
- packOnLinux builds multiple formats: tar.gz, deb, rpm, snap, AppImage using electron-builder
- uploadSnap implements cumulative channel promotion strategy

**Files:**
- workspaces/desktop-release-action/src/linux.ts

**Flow:**
setupSnapcraft (install) -> packOnLinux (build formats) -> uploadSnap (publish to channels)

**Timestamp:** 2026-04-04

## Narrative
### Structure
Linux build system in src/linux.ts exports three main functions: setupSnapcraft for installation, packOnLinux for building all formats, and uploadSnap for publishing to Snapcraft channels.

### Dependencies
Requires snapcraft CLI installed via snap, electron-builder for packaging, @actions/core for GitHub Actions group logging.

### Highlights
Cumulative channel promotion: uploadSnap uploads to ALL channels from edge up to the target level. Development snaps go to edge; tagged releases derive channel from semver prerelease.
