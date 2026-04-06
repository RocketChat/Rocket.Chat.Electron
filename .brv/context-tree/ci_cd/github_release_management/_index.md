---
children_hash: 47cd73a4e6b1e94ce53ce1a7f576eb6b7c170bb80617eef4d5301c52c3049848
compression_ratio: 0.4197651663405088
condensation_order: 1
covers: [context.md, github_release_management_system.md]
covers_token_total: 1022
summary_level: d1
token_count: 429
type: summary
---
# GitHub Release Management

## System Overview
GitHub release management system implemented in `workspaces/desktop-release-action/src/github.ts` using @actions/github Octokit client. Handles release creation/updates, asset management, and changelog generation with support for three release patterns.

## Release Types
- **Development**: Draft releases tagged `development-[SHA40]`, always created as draft
- **Snapshot**: Draft releases tagged `snapshot-[SHA40]`, always created as draft  
- **Tagged**: Semver releases (format: `^[0-9]+\.[0-9]+\.[0-9]+`), support prerelease flag based on semver metadata

## Asset Management
- **Override Pattern**: `overrideAsset` deletes existing asset by name before re-upload (idempotent upsert)
- **Stale Cleanup**: `clearStaleAssets` removes assets not in expected list
- **Force Cleanup**: `forceCleanOldAssets` triggers when release exceeds 900 assets, retains latest 100 to avoid GitHub's 1000-asset limit

## Core Functions
- `getDevelopmentRelease`: Finds or creates 'Development' draft release
- `getSnapshotRelease`: Finds or creates 'Snapshot' draft release
- `getTaggedRelease`: Looks up release by semver tag with prerelease support
- Changelog generation via `yarn conventional-changelog -p angular`

## Dependencies & Configuration
- **Libraries**: @actions/github (Octokit), @actions/core, semver, @octokit/webhooks-types
- **Repository Resolution**: Owner/name from inputs with fallback to `github.context.repo`
- **Shell Integration**: Uses runAndBuffer for changelog generation

## Related Topics
See `github_release_asset_cleanup_and_limit_management.md` for asset limit strategies and `desktop_release_action_routing_logic.md` for release routing patterns.