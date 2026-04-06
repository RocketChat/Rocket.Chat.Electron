---
title: Windows Signing Pipeline
tags: []
related: [structure/ci_cd/build_release_workflow.md, structure/ci_cd/desktop_release_action_routing_logic.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:49:02.433Z'
updatedAt: '2026-04-04T18:49:02.433Z'
---
## Raw Concept
**Task:**
Implement secure Windows code signing pipeline using KMS and jsign to avoid CNG provider conflicts

**Changes:**
- Two-phase approach separates setup from electron-builder execution
- Uses jsign (Java-based) instead of KMS CNG provider to avoid conflicts with MSI builds
- Google Cloud service account authentication for KMS key access
- Post-build signing and verification of executables and installers

**Files:**
- workspaces/desktop-release-action/src/windows/index.ts
- workspaces/desktop-release-action/src/windows/certificates.ts
- workspaces/desktop-release-action/src/windows/google-cloud.ts
- workspaces/desktop-release-action/src/windows/kms-provider.ts
- workspaces/desktop-release-action/src/windows/signing-tools.ts
- workspaces/desktop-release-action/src/windows/sign-packages.ts
- workspaces/desktop-release-action/src/windows/update-yaml-checksums.ts
- workspaces/desktop-release-action/src/windows/verify-signature.ts

**Flow:**
findSigntool → setupGoogleCloudAuth → setupCertificates → installJsign → installGoogleCloudCLI → authenticateGcloud → runElectronBuilder (NSIS/MSI/AppX) → verifyExecutableSignature → installKmsCngProvider → signBuiltPackages → verifyInstallerSignatures → updateYamlChecksums

**Timestamp:** 2026-04-04

**Patterns:**
- `^WIN_KMS_KEY_RESOURCE$` - Environment variable for KMS key resource identifier
- `^WIN_CERT_FILE$` - Environment variable for user certificate file path
- `^GOOGLE_APPLICATION_CREDENTIALS$` - Environment variable for Google Cloud service account JSON path
- `^GCLOUD_PATH$` - Environment variable for gcloud CLI executable path

## Narrative
### Structure
Windows signing pipeline in src/windows/index.ts exports packOnWindows() function. Four-phase architecture: Phase 1 (Setup) prepares signing environment before build; Phase 2 (Build) runs electron-builder for NSIS, MSI, and AppX packages; Phase 3 (Post-build signing) signs executables and installers using jsign; Phase 4 (Verification) validates signatures and updates checksums in latest.yml.

### Dependencies
Requires Google Cloud CLI (google-github-actions/setup-gcloud), jsign JAR (Java-based signing tool), signtool.exe (Windows SDK), electron-builder, KMS key access via service account, PEM certificates (user, intermediate, root).

### Highlights
Key innovation: uses jsign (Java-based) instead of KMS CNG provider to avoid conflicts with MSI builds. Supports three installer formats: NSIS, MSI, and AppX. Builds for multiple architectures: x64, ia32, arm64. Post-build signing allows independent signing after electron-builder completes. Automatic checksum updates in latest.yml for auto-update system.

### Rules
Rule 1: KMS key resource must be provided via win_kms_key_resource input
Rule 2: Google Cloud CLI must be pre-installed via google-github-actions/setup-gcloud
Rule 3: Signing tools must be installed BEFORE electron-builder runs
Rule 4: Jsign is used for both executable and installer signing to avoid CNG provider conflicts
Rule 5: KMS CNG provider is installed only after executables are signed (for installer signing)
Rule 6: All signatures must be verified via PowerShell Get-AuthenticodeSignature
Rule 7: SHA512 checksums in latest.yml must be recalculated after signing

### Examples
Environment variables passed to electron-builder: { WIN_KMS_KEY_RESOURCE, WIN_CERT_FILE, GOOGLE_APPLICATION_CREDENTIALS, GCLOUD_PATH }. Build commands: electron-builder --x64 --ia32 --arm64 --win nsis/msi/appx. Verification uses PowerShell Get-AuthenticodeSignature cmdlet.
