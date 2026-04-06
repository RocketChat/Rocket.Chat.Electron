---
title: GitHub Release Management System
tags: []
related: [ci_cd/github_release_management/github_release_asset_cleanup_and_limit_management.md, structure/ci_cd/desktop_release_action_routing_logic.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:50:48.787Z'
updatedAt: '2026-04-04T18:54:42.482Z'
---
## Raw Concept
**Task:**
GitHub release management system in desktop-release-action

**Files:**
- workspaces/desktop-release-action/src/github.ts

**Flow:**
Octokit initialization -> release getter (dev/snapshot/tagged) -> asset management (override/clear/force-clean) -> changelog generation

**Timestamp:** 2026-04-04

**Patterns:**
- `development-[a-f0-9]{40}` - Development release tag format with full commit SHA
- `snapshot-[a-f0-9]{40}` - Snapshot release tag format with full commit SHA
- `^[0-9]+\.[0-9]+\.[0-9]+` - Semantic version tag format

## Narrative
### Structure
GitHub release management is implemented in workspaces/desktop-release-action/src/github.ts using the @actions/github Octokit client. The module provides three release getter functions that handle finding or creating releases, and asset management utilities for managing release artifacts.

### Dependencies
@actions/github (Octokit client), @actions/core (GitHub Actions API), semver (version parsing), @octokit/webhooks-types (type definitions), shell utilities (runAndBuffer for changelog generation)

### Highlights
Supports three release types (development, snapshot, tagged). Implements idempotent asset override pattern. Handles GitHub 1000-asset limit with automatic cleanup. Generates changelogs using conventional-changelog with Angular preset.

### Rules
Rule 1: Development and Snapshot releases are always created as drafts (draft=true)
Rule 2: Tagged releases support prerelease flag based on semver prerelease field
Rule 3: Asset override deletes existing asset before uploading to ensure idempotency
Rule 4: Stale assets are cleaned by comparing against expected asset list
Rule 5: Force cleanup triggers when release exceeds 900 assets, keeps latest 100 by default
Rule 6: Repository owner/name resolve from inputs with fallback to github.context.repo

### Examples
Example tag format: development-abc123def456... (development release)
Example tag format: snapshot-abc123def456... (snapshot release)
Example tag format: v1.2.3 (tagged release with semver)

## Facts
- **release_management_library**: GitHub release management uses @actions/github Octokit library [project]
- **release_types**: Three release types: development (tagged development-SHA), snapshot (tagged snapshot-SHA), and tagged (semver version) [project]
- **development_release_getter**: getDevelopmentRelease finds or creates release named 'Development' with draft=true [project]
- **snapshot_release_getter**: getSnapshotRelease finds or creates release named 'Snapshot' with draft=true [project]
- **tagged_release_getter**: getTaggedRelease looks up release by semver tag and supports prerelease flag [project]
- **asset_override_pattern**: overrideAsset deletes existing asset by name then re-uploads (idempotent upsert pattern) [project]
- **stale_asset_cleanup**: clearStaleAssets deletes assets not in expected list [project]
- **asset_limit_management**: forceCleanOldAssets triggers when release has >900 assets to avoid GitHub 1000-asset limit [project]
- **repo_param_resolution**: Repository owner and name read from inputs, default to github.context.repo [project]
- **changelog_generation**: Changelog generated via 'yarn conventional-changelog -p angular' [project]
