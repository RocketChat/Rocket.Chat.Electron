---
title: Desktop Release Action Routing Logic
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:45:12.019Z'
updatedAt: '2026-04-04T18:45:12.019Z'
---
## Raw Concept
**Task:**
Route release builds to development, snapshot, or tagged GitHub releases based on git push event ref

**Changes:**
- Implemented three-mode release dispatcher in start() function
- Added GitHub asset limit guard (900+ assets → force clean to 100)
- Integrated snap channel mapping for prerelease versions
- Cross-platform packaging (Linux, macOS, Windows)

**Files:**
- workspaces/desktop-release-action/src/index.ts
- workspaces/desktop-release-action/src/github.ts
- workspaces/desktop-release-action/src/linux.ts
- workspaces/desktop-release-action/src/macos.ts
- workspaces/desktop-release-action/src/windows/index.ts

**Flow:**
push event → parse ref → dispatch to release mode → pack platform-specific artifacts → manage GitHub assets → upload snap (if applicable)

**Timestamp:** 2026-04-04

**Patterns:**
- `^refs/heads/dev$` - Development branch ref for rolling development releases
- `^refs/heads/master$` - Master branch ref for rolling snapshot releases
- `^refs/tags/.*` - Semantic version tag ref for tagged releases

## Narrative
### Structure
The release action is orchestrated by start() which reads github.context.eventName and github.context.payload.ref. Three async functions handle release modes: releaseDevelopment() for dev branch, releaseSnapshot() for master branch, releaseTagged() for semantic version tags. Each mode: (1) calls pack() for platform-specific builds, (2) retrieves/creates GitHub release, (3) manages assets with stale cleanup, (4) uploads artifacts, (5) handles snap uploads for Linux.

### Dependencies
Requires @actions/core, @actions/github, octokit/webhooks-types, fast-glob, semver. Imports platform-specific packers (linux.ts, macos.ts, windows/index.ts) and github asset utilities (github.ts).

### Highlights
Three release modes with distinct asset management: dev/snapshot use rolling releases with stale asset cleanup; tagged releases use draft releases and throw error if already published. GitHub asset limit guard forces cleanup when >900 assets exist (close to GitHub's 1000 limit), reducing to 100 assets. Snap channel routing: no prerelease → stable, prerelease[0]=candidate → candidate, prerelease[0]=beta → beta, else → edge.

### Rules
Rule 1: Only process push events (warn if other event types)
Rule 2: Development releases (dev branch) upload to rolling "development" GitHub release
Rule 3: Snapshot releases (master branch) upload to rolling "snapshot" GitHub release
Rule 4: Tagged releases must be draft releases; throw error if already published
Rule 5: If existing assets > 900, force clean down to 100 before uploading
Rule 6: Non-semantic tags on non-master branches perform snapshot release
Rule 7: Unrecognized refs skip release with warning
Rule 8: Snap uploads use channel determined by version prerelease field

### Examples
Example 1: Push to refs/heads/dev with commit abc123 → releaseDevelopment("abc123") → builds → uploads to development GitHub release → snap upload to edge channel
Example 2: Push to refs/tags/v1.2.3 → releaseTagged(SemVer{major:1,minor:2,patch:3}, commitSha) → builds → uploads to draft release v1.2.3 → snap upload to stable channel
Example 3: Push to refs/tags/v2.0.0-beta.1 → releaseTagged() → snap upload to beta channel

## Facts
- **dev_release_ref**: Development releases use refs/heads/dev branch [project]
- **snapshot_release_ref**: Snapshot releases use refs/heads/master branch [project]
- **tagged_release_ref**: Tagged releases use semantic version tags (refs/tags/<semver>) [project]
- **github_asset_limit_guard**: GitHub asset limit guard triggers at 900+ assets [project]
- **github_asset_force_clean_target**: Force clean reduces assets to 100 when limit approached [project]
- **snap_channel_mapping**: Snap channels: no prerelease=stable, candidate=candidate, beta=beta, else=edge [project]
- **tagged_release_constraint**: Tagged releases must be draft; throws error if published [project]
- **event_filter**: Action processes only push events; warns on other event types [project]
