---
title: Desktop Release Action
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:42:27.400Z'
updatedAt: '2026-04-04T18:42:27.400Z'
---
## Raw Concept
**Task:**
GitHub Action for building, signing, and publishing Rocket.Chat Desktop Electron app across Linux, macOS, and Windows platforms

**Changes:**
- Builds native packages for all three platforms
- Signs code for macOS (notarization) and Windows (KMS)
- Publishes to GitHub Releases and Snapcraft
- Handles development, snapshot, and tagged releases

**Files:**
- workspaces/desktop-release-action/src/index.ts
- workspaces/desktop-release-action/action.yml

**Flow:**
push event -> detect branch/tag -> pack (platform-specific) -> manage assets -> upload to GitHub/Snapcraft

**Timestamp:** 2026-04-04

## Narrative
### Structure
GitHub Action with entry point at dist/index.js (compiled from src/index.ts via @vercel/ncc). Runs on node12 runtime. Triggered by push events on dev, master, or tag refs.

### Dependencies
Requires platform-specific signing credentials: macOS (CSC cert, Apple ID), Windows (GCP KMS), GitHub token, Snapcraft token. Uses @actions/core, @actions/github, fast-glob, semver.

### Highlights
Handles three release types: development (dev branch), snapshot (master branch), and tagged releases (semantic versioning). Manages asset cleanup to prevent GitHub's 1000-asset limit. Automatically determines Snapcraft channel based on version prerelease type.

### Rules
Rule 1: Only processes push events (warns on other event types)
Rule 2: Development releases upload to "edge" Snapcraft channel
Rule 3: Snapshot releases upload to "edge" channel
Rule 4: Tagged releases determine channel from prerelease: stable (no prerelease), candidate (prerelease[0]=candidate), beta (prerelease[0]=beta), edge (fallback)
Rule 5: Does not update published releases (draft check enforced)
Rule 6: Cleans assets when release has >900 assets to prevent GitHub limit

## Facts
- **action_entry_point**: Entry point is dist/index.js compiled from src/index.ts [project]
- **runtime**: Action runs on node12 runtime [project]
- **trigger_events**: Triggered by push events on dev, master, or tag refs [project]
- **release_types**: Handles three release types: development, snapshot, and tagged [project]
- **asset_management**: Manages asset cleanup at 900+ assets to prevent GitHub 1000-limit [project]
