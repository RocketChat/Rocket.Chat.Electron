---
children_hash: ed86976fc0f6a4fe2d70c4c287ca8d8c9b9b50bf2656568f0b03b1748d115f50
compression_ratio: 0.2514271531397369
condensation_order: 2
covers: [context.md, desktop_release_action/_index.md, github_release_management/_index.md, linux_build_and_snapcraft_publishing/_index.md, macos_build_signing/_index.md, shell_utilities/_index.md, windows_signing/_index.md, windows_signing_and_kms/_index.md]
covers_token_total: 4029
summary_level: d2
token_count: 1013
type: summary
---
# CI/CD Domain Summary

## Purpose & Scope
Contains GitHub Actions workflows, build automation, and release processes for Rocket.Chat Electron desktop application across Linux, macOS, and Windows platforms. Excludes runtime behavior and UI implementation.

## Core Architecture

**Release Pipeline Flow:**
Push event → Release type validation → Platform-specific packaging → GitHub release management → Asset cleanup → Snapcraft publishing

**Release Types:**
- **Development** (`refs/heads/dev`): Draft releases, edge snap channel
- **Snapshot** (`refs/heads/master`): Draft releases, edge snap channel
- **Tagged** (semver): Published releases with channel routing based on prerelease status

## Platform-Specific Build Systems

### Linux (`linux_build_and_snapcraft_publishing`)
- Multi-format packaging: tar.gz, deb, rpm, snap, AppImage
- Cumulative Snapcraft channel promotion (edge → beta → candidate → stable)
- Three-function pipeline: setupSnapcraft → packOnLinux → uploadSnap

### macOS (`macos_build_signing`)
- Universal binary support (Intel + Apple Silicon)
- Enforced notarization via Apple notarytool
- Credential requirements: CSC_LINK (base64 p12), CSC_KEY_PASSWORD, APPLEID, ASC_PROVIDER
- Critical: Disable Spotlight indexing before DMG generation

### Windows (`windows_signing` + `windows_signing_and_kms`)
- Two-phase signing: jsign for executables (pre/during build), KMS CNG for post-build MSI/EXE
- Four-phase approach: Setup → Build → Post-build signing → Finalization with checksum updates
- Certificate chain: Three-certificate requirement (user + intermediate + root) installed to CurrentUser store
- Post-signing: Recalculate SHA512 checksums in latest.yml for auto-updater verification

## Asset Management System

**Upload Patterns** (`desktop_release_action`):
- YAML manifests: electron-builder auto-updater metadata
- Blockmap files: Binary delta maps (*.dmg.blockmap, *.exe.blockmap) for incremental updates
- Channel YAMLs: alpha.yml, beta.yml, stable.yml variants per platform

**Cleanup Strategy:**
- Triggers at 900+ assets (GitHub 1000-asset limit)
- `overrideAsset`: Idempotent upsert via delete-then-upload
- `forceCleanOldAssets`: Retains latest 100 assets when cleanup triggered
- Shared release upload across all platforms

## GitHub Release Management (`github_release_management`)

**Core Functions:**
- `getDevelopmentRelease` / `getSnapshotRelease`: Find or create draft releases
- `getTaggedRelease`: Lookup by semver tag with prerelease support
- `clearStaleAssets`: Remove unexpected assets
- Changelog generation via `yarn conventional-changelog -p angular`

**Dependencies:** @actions/github (Octokit), semver, @octokit/webhooks-types

## Utility Infrastructure (`shell_utilities`)

**Command Execution Functions:**
- `run(command, env?)`: Direct execution with collapsible logs, stdio inherit
- `runAndBuffer(command, env?)`: Output capture to UTF-8 string
- `runElectronBuilder(args, env?)`: Convenience wrapper with `--publish never`

**Environment Handling:** `mergeEnv()` preserves CI context while allowing workflow-specific overrides

## Key Architectural Decisions

1. **Separation of Concerns**: Platform-specific build logic isolated in dedicated modules (linux.ts, macos.ts, windows/)
2. **Two-Phase Windows Signing**: jsign pre-build + KMS CNG post-build avoids WiX MSI conflicts
3. **Cumulative Channel Promotion**: Snaps propagate systematically through release pipeline
4. **Asset Cleanup Automation**: Prevents GitHub 1000-asset limit violations without manual intervention
5. **Checksum Recalculation**: Post-signing updates ensure auto-updater verification succeeds

## Critical Constraints

- Only processes push events (warns on other triggers)
- Tagged releases update draft releases only (prevents overwriting published)
- Spotlight indexing must be disabled before macOS DMG generation
- KMS CNG provider installed **after** electron-builder (not before)
- All three platforms upload to same GitHub release
- Signature verification required after each Windows signing phase