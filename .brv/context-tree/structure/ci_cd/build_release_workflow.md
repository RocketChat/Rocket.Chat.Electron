---
title: Build Release Workflow
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:43:22.993Z'
updatedAt: '2026-04-04T18:43:22.993Z'
---
## Raw Concept
**Task:**
Document the GitHub Actions build-release workflow for multi-platform Electron app packaging and signing

**Changes:**
- Automated release builds on master, dev, and tag pushes
- Multi-OS matrix testing (Ubuntu, macOS, Windows)
- Platform-specific signing: macOS notarization, Windows KMS
- Concurrent build cancellation to prevent redundant runs

**Files:**
- .github/workflows/build-release.yml
- ./workspaces/desktop-release-action

**Flow:**
push to master/dev/tag -> trigger workflow -> matrix build (3 OS) -> lint -> test -> build (NODE_ENV=production) -> platform-specific signing -> publish via desktop-release-action

**Timestamp:** 2026-04-04

**Patterns:**
- `^(master|dev)$|^\*$` - Matches master, dev branches or any tag

## Narrative
### Structure
Single job "build" runs on 3-OS matrix (ubuntu-latest, macos-latest, windows-latest) with fail-fast: false. Node.js 24.11.1 is configured. Dependencies are cached using yarn.lock hash.

### Dependencies
Requires GitHub secrets for signing: MAC_CSC_LINK, MAC_CSC_KEY_PASSWORD, APPLEID, APPLEIDPASS, GCP_SA_JSON (Windows), WIN_KMS_KEY_RESOURCE, WIN_USER_CRT, WIN_INTERMEDIATE_CRT, WIN_ROOT_CRT, GH_TOKEN. Linux build deps: xz-utils, libarchive-tools, squashfs-tools.

### Highlights
Supports multi-platform release packaging with automated signing. macOS uses CSC notarization. Windows uses Google Cloud KMS via jsign. Snapcraft support for Linux. Concurrent run cancellation prevents duplicate builds.

### Rules
Rule 1: git core.autocrlf is disabled globally to prevent line-ending issues
Rule 2: fetch-depth: 0 ensures full git history for version detection
Rule 3: NODE_ENV must be set to production during yarn build
Rule 4: Windows-only gcloud setup with version >=536.0.0
Rule 5: macOS ASC provider is S6UPZG7ZR3 (Apple Notary Service)
Rule 6: Concurrency group uses github.workflow and github.ref to cancel in-progress runs

### Examples
Trigger: git push origin master, git push origin dev, git tag v1.0.0 && git push --tags. Windows authentication uses Google Cloud service account JSON. macOS notarization requires valid Apple ID and password.

## Facts
- **build_release_trigger**: Build release workflow triggers on push to master or dev branches, or any git tag [project]
- **concurrency_config**: Concurrency group uses github.workflow and github.ref, with cancel-in-progress enabled [convention]
- **os_matrix**: Matrix strategy runs on 3 OS: ubuntu-latest, macos-latest, windows-latest [project]
- **node_version**: Node.js version is 24.11.1 [project]
- **linux_build_deps**: Linux build dependencies: xz-utils, libarchive-tools, squashfs-tools [project]
- **build_environment**: NODE_ENV is set to production during build [convention]
- **macos_signing**: macOS signing uses CSC_LINK and notarization via APPLEID/APPLEIDPASS [convention]
- **windows_signing**: Windows signing uses Google Cloud KMS via jsign [convention]
- **macos_asc_provider**: macOS ASC provider ID is S6UPZG7ZR3 [project]
- **gcloud_setup**: Google Cloud setup is Windows-only with version >=536.0.0 [convention]
- **release_action_path**: Desktop release action is invoked from ./workspaces/desktop-release-action [project]
- **github_permissions**: Permissions are set to contents: read [convention]
