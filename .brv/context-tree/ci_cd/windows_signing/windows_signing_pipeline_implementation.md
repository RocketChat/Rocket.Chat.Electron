---
title: Windows Signing Pipeline Implementation
tags: []
related: [ci_cd/windows_signing_and_kms/windows_certificate_and_kms_provider_setup.md, ci_cd/github_release_management/github_release_management_system.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:52:31.766Z'
updatedAt: '2026-04-04T18:52:33.996Z'
---
## Raw Concept
**Task:**
Implement secure Windows package signing using Google Cloud KMS with jsign and electron-builder

**Changes:**
- Implemented two-phase signing approach to avoid KMS CNG provider conflicts with MSI builds
- Phase 1: Setup signing environment before build (signtool, GCP auth, certificates, jsign, gcloud CLI)
- Phase 2: Build with electron-builder (NSIS, MSI, AppX packages)
- Phase 3: Post-build signing of *.exe and *.msi with jsign via KMS key
- Phase 4: Finalize with checksum updates and signature verification

**Files:**
- workspaces/desktop-release-action/src/windows/index.ts
- workspaces/desktop-release-action/src/windows/signing-tools.ts
- workspaces/desktop-release-action/src/windows/google-cloud.ts
- workspaces/desktop-release-action/src/windows/certificates.ts
- workspaces/desktop-release-action/src/windows/kms-provider.ts
- workspaces/desktop-release-action/src/windows/sign-packages.ts
- workspaces/desktop-release-action/src/windows/update-yaml-checksums.ts
- workspaces/desktop-release-action/src/windows/verify-signature.ts

**Flow:**
findSigntool() -> setupGoogleCloudAuth() -> setupCertificates() -> installJsign() -> installGoogleCloudCLI() -> authenticateGcloud() -> runElectronBuilder(NSIS/MSI/AppX) -> verifyExecutableSignature() -> installKmsCngProvider() -> signBuiltPackages() -> verifyInstallerSignatures() -> updateYamlChecksums()

**Timestamp:** 2026-04-04

**Author:** Desktop Release Action

**Patterns:**
- `^WIN_KMS_KEY_RESOURCE$` (flags: m) - Environment variable for Google Cloud KMS key resource identifier
- `^WIN_CERT_FILE$` (flags: m) - Environment variable for Windows certificate file path
- `^GOOGLE_APPLICATION_CREDENTIALS$` (flags: m) - Environment variable for GCP service account JSON credentials path
- `^GCLOUD_PATH$` (flags: m) - Environment variable for gcloud CLI executable path

## Narrative
### Structure
The Windows signing pipeline is implemented in src/windows/index.ts (packOnWindows function). It uses a modular architecture with separate modules for: signtool discovery, Google Cloud authentication, certificate setup, jsign installation, gcloud CLI setup, KMS provider installation, package signing, checksum updates, and signature verification. Environment variables (WIN_KMS_KEY_RESOURCE, WIN_CERT_FILE, GOOGLE_APPLICATION_CREDENTIALS, GCLOUD_PATH) are passed to electron-builder via buildEnv object and process.env.

### Dependencies
Requires: Google Cloud KMS service account, jsign JAR (Java-based signing tool), electron-builder, gcloud CLI, signtool.exe, PowerShell for signature verification. KMS CNG provider must NOT be installed before build (causes conflicts with MSI signing).

### Highlights
Key innovation: Two-phase approach separates executable signing (via jsign during/after build) from installer signing (via KMS CNG provider post-build) to avoid conflicts. Jsign avoids CNG provider requirement for *.exe files. Post-build signing adds signatures to *.msi and *.appx packages. Checksum updates in latest.yml after signing. Signature verification via PowerShell Get-AuthenticodeSignature.

### Rules
Rule 1: KMS CNG provider must be installed AFTER electron-builder completes, not before
Rule 2: jsign must be installed BEFORE build to avoid CNG conflicts
Rule 3: win_kms_key_resource input is required and must be provided
Rule 4: All environment variables (WIN_KMS_KEY_RESOURCE, WIN_CERT_FILE, GOOGLE_APPLICATION_CREDENTIALS, GCLOUD_PATH) must be set before electron-builder runs
Rule 5: Signature verification must occur after each signing phase
Rule 6: latest.yml checksums must be recalculated after post-build signing

### Examples
Environment setup example: {WIN_KMS_KEY_RESOURCE: "projects/PROJECT_ID/locations/LOCATION/keyRings/RING/cryptoKeys/KEY", WIN_CERT_FILE: "/tmp/cert.pem", GOOGLE_APPLICATION_CREDENTIALS: "/tmp/gcp-sa.json", GCLOUD_PATH: "/usr/local/bin/gcloud"}. Build command: runElectronBuilder("--x64 --ia32 --arm64 --win nsis", buildEnv). Signing command: signBuiltPackages(distPath) which signs *.exe and *.msi with jsign.
