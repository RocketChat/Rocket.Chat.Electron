---
title: Desktop Release Action File Upload Strategy
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:51:01.102Z'
updatedAt: '2026-04-04T18:51:01.102Z'
---
## Raw Concept
**Task:**
Document the desktop release action file upload strategy and GitHub asset management

**Changes:**
- Asset cleanup strategy handles GitHub's 1000 asset limit
- Force clean removes 100 assets when count exceeds 900
- Stale asset cleanup removes files not in current build
- AppX files uploaded but NOT signed by action

**Files:**
- workspaces/desktop-release-action/src/index.ts
- workspaces/desktop-release-action/src/github.ts
- workspaces/desktop-release-action/src/linux.ts
- workspaces/desktop-release-action/src/macos.ts
- workspaces/desktop-release-action/src/windows/index.ts

**Flow:**
Push event detected -> Platform-specific packing -> Release type determination -> Asset cleanup -> Asset upload -> Snap channel routing

**Timestamp:** 2026-04-04

## Narrative
### Structure
The action orchestrates platform-specific packaging and GitHub release asset management. The pack() function switches on process.platform to call setupSnapcraft+packOnLinux, disableSpotlightIndexing+packOnMacOS, or packOnWindows. Three release types are triggered by git ref: development (refs/heads/dev), snapshot (refs/heads/master or non-semantic tags), and tagged (semantic version tags). Each release type follows the same asset management pattern: pack -> get/create release -> clean assets -> upload files.

### Dependencies
Depends on platform-specific modules (linux, macos, windows), GitHub API (octokit), electron-builder for packaging, semver for version parsing, fast-glob for file discovery. Uses GitHub Actions core API for logging and input handling.

### Highlights
Supports three release channels (stable, candidate, beta, edge) for snap uploads. Handles asset override to replace existing files. Asset cleanup prevents GitHub release asset limit (1000 max). All three platform runners upload to the same release, enabling cross-platform builds in CI/CD.

### Rules
Rule 1: Action only runs on push events
Rule 2: AppX files are NOT signed by the action
Rule 3: If release exists and is not draft, throw error "not updating a published release"
Rule 4: Asset cleanup triggered when count exceeds 900
Rule 5: Snap uploads use channel based on version prerelease type
Rule 6: Expected asset names must match files in dist/ directory
