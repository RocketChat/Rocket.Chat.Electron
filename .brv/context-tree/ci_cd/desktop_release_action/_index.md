---
children_hash: fce86486a27472233517e4f97e6bbf28fdc610fc598bcd138d2f565bccab8433
compression_ratio: 0.34418865805727117
condensation_order: 1
covers: [context.md, desktop_release_action_workflow.md, release_asset_upload_patterns.md]
covers_token_total: 1781
summary_level: d1
token_count: 613
type: summary
---
# Desktop Release Action

## Overview
GitHub Actions workflow automating multi-platform packaging and release management for Rocket.Chat Electron. Handles development, snapshot, and tagged releases across Linux, macOS, and Windows with asset cleanup and Snapcraft publishing.

## Architecture

**Release Flow:**
Push event → validate trigger type → platform-specific packaging → GitHub release management → asset cleanup → Snapcraft publishing

**Release Types:**
- **Development**: `refs/heads/dev` → edge snap channel
- **Snapshot**: `refs/heads/master` → edge snap channel  
- **Tagged**: Semantic version tags → snap channels (stable/candidate/beta/edge based on prerelease status)

## Platform-Specific Packaging

**Linux** (`packOnLinux`):
- Artifacts: latest-linux.yml, *.tar.gz, *.snap, *.deb, *.rpm, *.AppImage

**macOS** (`packOnMacOS`):
- Artifacts: latest-mac.yml, *.pkg, *.zip, *.dmg, *.dmg.blockmap, mas-universal/*.pkg
- MAS (Mac App Store) packages in dedicated subdirectory

**Windows** (`packOnWindows`):
- Artifacts: latest.yml, *.appx, *.msi, *.exe, *.exe.blockmap
- AppX uploaded but NOT signed by action
- MSI service fix prevents LGHT0217 WiX errors via msiexec /unregister + /regserver

## Asset Management

**Upload Patterns** (see `release_asset_upload_patterns.md`):
- YAML manifests: electron-builder auto-updater metadata for update checks
- Blockmap files: Binary delta maps (*.dmg.blockmap, *.exe.blockmap) for incremental updates
- Channel YAMLs: alpha.yml, alpha-mac.yml, alpha-linux.yml, beta.yml, beta-mac.yml, beta-linux.yml

**Cleanup Strategy:**
- Triggers when release exceeds 900 assets (GitHub 1000-asset limit)
- Removes stale assets to prevent limit violations
- All three platforms upload to same GitHub release

## Key Constraints

- Only processes push events (warns on other triggers)
- Tagged releases update draft releases only (prevents overwriting published releases)
- Snap publishing channel determined by version prerelease status
- Shared release upload across all platforms

## Related Topics
- `desktop_release_action_workflow.md` - Detailed workflow implementation
- `release_asset_upload_patterns.md` - Complete artifact patterns and purposes
- `ci_cd/github_release_management` - GitHub release asset operations
- `ci_cd/linux_build_and_snapcraft_publishing` - Linux-specific build details
- `ci_cd/macos_build_signing` - macOS code signing
- `ci_cd/windows_signing` - Windows signing pipeline