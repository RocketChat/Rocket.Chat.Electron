---
title: Linux Build and Snapcraft Publishing
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:48:39.391Z'
updatedAt: '2026-04-04T18:48:39.391Z'
---
## Raw Concept
**Task:**
Linux build system and Snapcraft publishing workflow for desktop releases

**Changes:**
- setupSnapcraft() installs snapcraft via snap package manager
- packOnLinux() builds all Linux formats (tar.gz, deb, rpm, snap, AppImage)
- uploadSnap() implements cumulative channel promotion strategy

**Files:**
- workspaces/desktop-release-action/src/linux.ts

**Flow:**
setupSnapcraft() -> packOnLinux() -> uploadSnap() with cumulative channel promotion

## Narrative
### Structure
Three main functions in linux.ts: (1) setupSnapcraft() runs in a group context using core.group() and executes sudo snap install snapcraft --classic --channel stable. (2) packOnLinux() delegates to runElectronBuilder with flags for all Linux formats. (3) uploadSnap() takes snapFilePath and a target channel level, then uploads to all channels up to and including that level.

### Highlights
Channel promotion is cumulative: given level="beta", uploads to both "edge" and "beta". Development releases target "edge", tagged releases derive channel from semver prerelease. Snapcraft channels in order: edge → beta → candidate → stable.

### Rules
Rule 1: uploadSnap() uses snapChannels.slice(0, indexOf(level) + 1) to get cumulative channels
Rule 2: Each channel upload runs in its own core.group() with descriptive logging
Rule 3: snapcraft upload command uses --release={channel} flag with quoted file path
