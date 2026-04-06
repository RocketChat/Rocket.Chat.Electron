---
children_hash: 7e956ae79e39e38c994ac7ede593649877f0bb34c8bad61e0bf547f585ad3c80
compression_ratio: 0.22382217251502867
condensation_order: 1
covers: [build_release_workflow.md, context.md, desktop_release_action_file_upload_strategy.md, desktop_release_action_routing_logic.md, github_release_asset_cleanup_and_limit_management.md, github_release_asset_upload_patterns_by_platform.md, linux_build_and_snapcraft_publishing.md, powershell_linting_workflow.md, pull_request_build_workflow.md, pull_request_validation_workflow.md, windows_signing_pipeline.md]
covers_token_total: 7153
summary_level: d1
token_count: 1601
type: summary
---
# CI/CD Domain Summary

## Overview
Comprehensive multi-platform CI/CD infrastructure for Rocket.Chat Electron, spanning build automation, code signing, artifact management, and release distribution across Windows, macOS, and Linux.

## Core Workflows

### Build & Release Pipeline
**build_release_workflow.md** orchestrates the primary release process:
- Triggers on master/dev branch pushes and semantic version tags
- 3-OS matrix (Ubuntu, macOS, Windows) with fail-fast disabled
- Node.js 24.11.1, yarn caching via yarn.lock hash
- Platform-specific signing: macOS CSC notarization (ASC provider S6UPZG7ZR3), Windows Google Cloud KMS via jsign, Linux Snapcraft
- Concurrent run cancellation per workflow + ref to prevent redundant builds
- Requires GitHub secrets: MAC_CSC_LINK, MAC_CSC_KEY_PASSWORD, APPLEID, APPLEIDPASS, GCP_SA_JSON, WIN_KMS_KEY_RESOURCE, certificate chain (WIN_USER_CRT, WIN_INTERMEDIATE_CRT, WIN_ROOT_CRT), GH_TOKEN
- Linux build deps: xz-utils, libarchive-tools, squashfs-tools

### Pull Request Validation
**pull_request_validation_workflow.md** provides standard CI checks:
- Triggers on PR events targeting master/dev
- 3-OS matrix with fail-fast disabled
- Steps: lint → test → build (NODE_ENV=production) → smoke-test executables
- Smoke tests: 30-second timeout per binary on all platforms
- Linux: xvfb-run with --no-sandbox flag
- macOS: tests both mac and mac-arm64 app bundles
- Windows: PowerShell Start-Job for x64 and ia32 executables

### Pull Request Build Artifacts
**pull_request_build_workflow.md** enables optional artifact builds:
- Requires build-artifacts label on PR
- Multi-platform builds with code signing enabled
- Artifact upload to Wasabi S3 with public-read ACL and download links in PR comments
- macOS: CSC_FOR_PULL_REQUEST=true, FORCE_NOTARIZE=true
- Windows: KMS provider cached at build/installers/google-cloud-kms-cng-provider.msi
- Linux: snap publishing to edge channel via snapcore/action-publish@v1
- Supports x64, ia32, arm64 on Windows; universal binary on macOS

### PowerShell Linting
**powershell_linting_workflow.md** validates CI scripts:
- Path-filtered trigger on .ps1/.psm1/.psd1 changes or workflow modifications
- Windows runner with PSScriptAnalyzer from PSGallery
- Excludes PSAvoidUsingWriteHost rule (Write-Host acceptable for CI output)
- Recursive analysis across entire repository

## Release Action System

### Release Routing Logic
**desktop_release_action_routing_logic.md** dispatches builds to three release modes:
- **Development** (refs/heads/dev): rolling "development" GitHub release, snap edge channel
- **Snapshot** (refs/heads/master): rolling "snapshot" GitHub release, snap edge channel
- **Tagged** (semantic version tags): draft release per version, snap channel derived from prerelease field
  - No prerelease → stable
  - prerelease[0]=candidate → candidate
  - prerelease[0]=beta → beta
  - else → edge
- Error thrown if attempting to update already-published tagged release
- Only processes push events; warns on other event types

### Asset Management
**github_release_asset_cleanup_and_limit_management.md** prevents GitHub's 1000 asset limit:
- Force clean removes 100 oldest assets when count exceeds 900 (90% capacity threshold)
- Stale cleanup removes assets not in current build's expected asset names
- Cleanup only in development/snapshot releases; tagged releases skip cleanup
- Triggered before asset upload to prevent limit violations

**github_release_asset_upload_patterns_by_platform.md** defines platform-specific uploads:
- **Linux**: latest-linux.yml, *.tar.gz, *.snap, *.deb, *.rpm, *.AppImage
- **macOS**: latest-mac.yml, *.pkg, *.zip, *.dmg, *.dmg.blockmap, mas-universal/*.pkg
- **Windows**: latest.yml, *.appx, *.msi, *.exe, *.exe.blockmap
- **All platforms**: alpha.yml, alpha-mac.yml, alpha-linux.yml, beta.yml, beta-mac.yml, beta-linux.yml
- YAML files are electron-builder auto-updater manifests
- Blockmap files enable delta updates for faster downloads
- AppX files included but NOT signed by action

**desktop_release_action_file_upload_strategy.md** orchestrates uploads:
- Platform-specific packing via pack() function switching on process.platform
- Release type determination from git ref
- Asset cleanup → asset upload → snap channel routing
- All three platform runners upload to same GitHub release for parallel cross-platform builds

## Platform-Specific Implementations

### Linux Build & Snapcraft
**linux_build_and_snapcraft_publishing.md** handles Linux releases:
- setupSnapcraft(): installs snapcraft via snap package manager (--classic --channel stable)
- packOnLinux(): builds tar.gz, deb, rpm, snap, AppImage via electron-builder
- uploadSnap(): cumulative channel promotion strategy
  - Given level="beta", uploads to both "edge" and "beta"
  - Channel order: edge → beta → candidate → stable
  - Each upload runs in core.group() with descriptive logging

### Windows Signing Pipeline
**windows_signing_pipeline.md** implements secure code signing:
- Four-phase architecture: Setup → Build → Post-build signing → Verification
- Two-phase approach separates setup from electron-builder to avoid CNG provider conflicts
- Uses jsign (Java-based) instead of KMS CNG provider for signing
- Supports NSIS, MSI, and AppX installers; x64, ia32, arm64 architectures
- Post-build signing allows independent signing after electron-builder completes
- Automatic SHA512 checksum updates in latest.yml for auto-update system
- Verification via PowerShell Get-AuthenticodeSignature
- Files: windows/index.ts, windows/certificates.ts, windows/google-cloud.ts, windows/kms-provider.ts, windows/signing-tools.ts, windows/sign-packages.ts, windows/update-yaml-checksums.ts, windows/verify-signature.ts

## Key Architectural Patterns

- **Multi-platform matrix jobs** with fail-fast disabled for visibility into all platform failures
- **Concurrent run cancellation** per workflow + ref prevents duplicate builds
- **Stale asset cleanup** maintains GitHub release asset limits for long-running projects
- **Cumulative snap channel promotion** enables staged rollouts (edge → beta → candidate → stable)
- **Post-build signing separation** avoids tool conflicts and enables independent verification
- **Parallel cross-platform uploads** to single GitHub release enables coordinated releases
- **Path-filtered workflows** reduce unnecessary CI runs on unrelated file changes