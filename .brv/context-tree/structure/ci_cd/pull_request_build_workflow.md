---
title: Pull Request Build Workflow
tags: []
related: [structure/ci_cd/linux_build_and_snapcraft_publishing.md, structure/ci_cd/build_release_workflow.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:49:29.459Z'
updatedAt: '2026-04-04T18:49:29.459Z'
---
## Raw Concept
**Task:**
Build and test Rocket.Chat Electron app across three platforms (Windows, macOS, Linux) on pull requests with build-artifacts label

**Changes:**
- Automated multi-platform builds for PR validation
- Code signing for Windows (KMS), macOS (CSC), and Linux (Snap)
- Artifact upload to Wasabi S3 with public download links
- Snap Store publishing for Linux builds

**Files:**
- .github/workflows/pull-request-build.yml
- build/install-kms-cng-provider.ps1

**Flow:**
PR labeled with build-artifacts → Matrix jobs (Windows/macOS/Linux) → Build & Sign → Upload to S3 → Comment with download links

**Timestamp:** 2026-04-04

**Patterns:**
- `rocketchat-\*\.(exe|msi|dmg|pkg|snap|AppImage|deb)` - Artifact file patterns by platform
- `^pull_request` - Workflow trigger event

## Narrative
### Structure
Three parallel matrix jobs (Ubuntu, macOS, Windows) with platform-specific setup. Common steps: checkout, Node 24.11.1, yarn install/lint/test/build. Platform-specific: Windows (KMS cert signing), macOS (CSC notarization), Linux (Snap publishing).

### Dependencies
Requires GCP credentials (JSON), code signing certificates (Windows/macOS), Wasabi S3 access (WASABI_ACCESS_KEY_ID, WASABI_SECRET_ACCESS_KEY, WASABI_BUCKET_NAME), Snapcraft credentials, Apple ID credentials, GitHub token.

### Highlights
Supports x64, ia32, arm64 architectures on Windows. macOS universal binary. Linux snap/deb/appimage. Fail-fast disabled for visibility into all platform failures. Artifacts publicly accessible via S3 links in PR comments.

### Rules
Rule 1: Workflow only triggers on pull_request events targeting master or dev branches
Rule 2: Conditional execution requires build-artifacts label on PR
Rule 3: Concurrency cancels in-progress builds per head ref
Rule 4: All artifacts uploaded to Wasabi S3 with public-read ACL
Rule 5: macOS requires CSC_FOR_PULL_REQUEST=true and FORCE_NOTARIZE=true
Rule 6: Windows KMS provider cached at build/installers/google-cloud-kms-cng-provider.msi
Rule 7: Linux builds publish snap to edge channel via snapcore/action-publish@v1

### Examples
Windows build: yarn electron-builder --publish never --x64 --ia32 --arm64 --win nsis msi. macOS: sudo mdutil -a -i off && yarn electron-builder --publish never --mac --universal. Linux: yarn electron-builder --publish never --linux snap deb appimage
