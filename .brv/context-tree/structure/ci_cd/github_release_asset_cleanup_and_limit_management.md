---
title: GitHub Release Asset Cleanup and Limit Management
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:51:01.104Z'
updatedAt: '2026-04-04T18:51:01.104Z'
---
## Raw Concept
**Task:**
Document the asset cleanup strategy to manage GitHub's 1000 asset limit

**Changes:**
- Force clean removes 100 oldest assets when count exceeds 900
- Stale cleanup removes assets not in current build's expected asset names
- Both strategies prevent hitting GitHub's 1000 asset per release limit

**Files:**
- workspaces/desktop-release-action/src/index.ts

**Flow:**
getReleaseAssets(release.id) -> check count -> if count > 900 then forceCleanOldAssets(release.id, 100) else clearStaleAssets(release.id, expectedAssetNames)

**Timestamp:** 2026-04-04

## Narrative
### Structure
Asset cleanup is performed in both releaseDevelopment() and releaseSnapshot() functions (but NOT in releaseTagged() which only uploads to tagged releases). After getting existing assets, the code checks if count exceeds 900. If so, forceCleanOldAssets(release.id, 100) is called to remove 100 oldest assets. Otherwise, clearStaleAssets() compares expected asset names from current build against existing assets and removes stale files.

### Dependencies
Depends on getReleaseAssets(release.id) to fetch existing assets, forceCleanOldAssets() to remove by age, and clearStaleAssets() to remove by name mismatch.

### Highlights
GitHub releases have a hard limit of 1000 assets per release. The action proactively manages this by triggering cleanup at 900 assets (90% capacity). Development and snapshot releases accumulate assets over time, so cleanup is critical for long-running projects. Tagged releases do not perform cleanup.

### Rules
Rule 1: If existingAssets.length > 900, call forceCleanOldAssets(release.id, 100)
Rule 2: Otherwise, call clearStaleAssets(release.id, expectedAssetNames)
Rule 3: expectedAssetNames derived from getFilesToUpload() via basename()
Rule 4: Asset cleanup only in development and snapshot releases, not tagged releases
