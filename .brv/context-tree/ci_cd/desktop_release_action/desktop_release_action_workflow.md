---
title: Desktop Release Action Workflow
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:59:05.763Z'
updatedAt: '2026-04-04T18:59:05.763Z'
---
## Raw Concept
**Task:**
GitHub Actions workflow for building and releasing Rocket.Chat Electron desktop application across Linux, macOS, and Windows platforms

**Changes:**
- Handles multi-platform packaging (Linux, macOS, Windows)
- Manages asset uploads to GitHub releases
- Implements development, snapshot, and tagged release flows
- Cleans stale assets to prevent GitHub 1000-asset limit
- Publishes Snap packages to Snapcraft
- Fixes Windows Installer service issues

**Files:**
- workspaces/desktop-release-action/src/index.ts
- workspaces/desktop-release-action/src/github.ts
- workspaces/desktop-release-action/src/linux.ts
- workspaces/desktop-release-action/src/macos.ts
- workspaces/desktop-release-action/src/windows/index.ts

**Flow:**
GitHub push event → validate event type → pack application (platform-specific) → get/create release → clean stale assets → upload build artifacts → publish snap (if applicable)

**Timestamp:** 2026-04-04

**Patterns:**
- `^refs/heads/dev$` - Development branch trigger for development releases
- `^refs/heads/master$` - Master branch trigger for snapshot releases
- `^refs/tags/` - Tag pattern for tagged releases with semantic versioning

## Narrative
### Structure
The action is triggered on push events and routes to three release types based on git ref: development (dev branch), snapshot (master branch), or tagged (semantic version tags). Each release type calls platform-specific pack functions (packOnLinux, packOnMacOS, packOnWindows) and then uploads artifacts to GitHub releases.

### Dependencies
Requires @actions/core and @actions/github for GitHub Actions integration, fast-glob for file globbing, semver for version parsing, and platform-specific tools (Snapcraft for Linux, xcode for macOS, Windows SDK for Windows). Depends on electron-builder for packaging.

### Highlights
Supports three release channels (development, snapshot, tagged with alpha/beta/candidate/stable snap channels). Implements asset cleanup when release has >900 assets to prevent GitHub's 1000-asset limit. Snap packages published to different channels based on version prerelease status.

### Rules
Rule 1: Only processes push events, warns if triggered by other event types
Rule 2: Forces cleanup of old assets if count exceeds 900 (approaches GitHub limit)
Rule 3: For tagged releases, only updates draft releases (prevents overwriting published releases)
Rule 4: AppX (Microsoft Store) is uploaded but NOT signed by the action
Rule 5: All three platform runners upload to the same GitHub release
Rule 6: Snap publishing channel determined by version: stable (release), candidate (prerelease[0]=candidate), beta (prerelease[0]=beta), edge (all others)

### Examples
Example release files: Linux (latest-linux.yml, *.tar.gz, *.snap, *.deb, *.rpm, *.AppImage), macOS (latest-mac.yml, *.pkg, *.zip, *.dmg, *.dmg.blockmap, mas-universal/*.pkg), Windows (latest.yml, *.appx, *.msi, *.exe, *.exe.blockmap). Alpha/beta channel YAMLs: alpha.yml, alpha-mac.yml, alpha-linux.yml, beta.yml, beta-mac.yml, beta-linux.yml

## Facts
- **dev_branch_trigger**: Development releases triggered by push to refs/heads/dev [project]
- **master_branch_trigger**: Snapshot releases triggered by push to refs/heads/master [project]
- **tag_trigger**: Tagged releases triggered by push to semantic version tags [project]
- **asset_limit_threshold**: Asset cleanup triggered when release has >900 assets [project]
- **snap_edge_channel**: Snap packages published to edge channel for development/snapshot releases [project]
- **appx_signing**: AppX packages uploaded but not signed by the action [project]
- **shared_release_upload**: All three platforms upload to the same GitHub release [project]
- **msi_service_fix**: MSI service fix prevents LGHT0217 WiX errors via msiexec /unregister + /regserver [project]
