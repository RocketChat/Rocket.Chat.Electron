---
children_hash: 59baf7e5e09be5bfed8b94471a0e470230148c38b5c12ed56bb6e5a9ea5c3036
compression_ratio: 0.4188861985472155
condensation_order: 1
covers: [context.md, windows_signing_pipeline_implementation.md, yaml_checksum_update_post_signing.md]
covers_token_total: 1652
summary_level: d1
token_count: 692
type: summary
---
# Windows Signing Pipeline

## Overview
The Windows signing pipeline implements secure package signing using Google Cloud KMS, handling the complete lifecycle from environment setup through post-build signature verification and checksum updates.

## Architecture

**Four-Phase Approach:**
1. **Setup Phase** – Configure signtool, GCP authentication, certificates, jsign, and gcloud CLI
2. **Build Phase** – Execute electron-builder for NSIS, MSI, and AppX packages
3. **Post-Build Signing** – Sign *.exe and *.msi packages using jsign via KMS key
4. **Finalization** – Verify signatures and recalculate checksums in latest.yml

**Key Innovation:** Two-phase signing strategy separates executable signing (jsign during/after build) from installer signing (KMS CNG provider post-build) to avoid conflicts with MSI builds.

## Core Components

**Implementation Files** (src/windows/):
- `index.ts` – Main orchestration (packOnWindows function)
- `signing-tools.ts` – Signtool discovery
- `google-cloud.ts` – GCP authentication
- `certificates.ts` – Certificate setup
- `kms-provider.ts` – KMS CNG provider installation
- `sign-packages.ts` – Package signing logic
- `update-yaml-checksums.ts` – Checksum recalculation
- `verify-signature.ts` – Signature verification

**Environment Variables:**
- `WIN_KMS_KEY_RESOURCE` – Google Cloud KMS key identifier
- `WIN_CERT_FILE` – Windows certificate file path
- `GOOGLE_APPLICATION_CREDENTIALS` – GCP service account credentials
- `GCLOUD_PATH` – gcloud CLI executable path

## Critical Rules

1. KMS CNG provider must be installed **after** electron-builder completes (not before)
2. jsign must be installed **before** build to avoid CNG conflicts
3. All environment variables must be set before electron-builder runs
4. Signature verification required after each signing phase
5. latest.yml checksums must be recalculated after post-build signing

## Post-Signing Checksum Updates

**Purpose:** Ensure auto-updater verification succeeds after signatures are added to binaries.

**Process** (see `yaml_checksum_update_post_signing.md`):
- Recalculate SHA512 checksums as base64 digest
- Update file sizes in latest.yml
- Preserve YAML formatting with consistent structure
- Skip missing files with warnings

**Functions:** `updateWindowsYamlChecksums(distPath)` and `updateYamlChecksums(distPath)` in update-yaml-checksums.ts

## Dependencies

- Google Cloud KMS service account
- jsign (Java-based signing tool)
- electron-builder
- gcloud CLI
- signtool.exe
- PowerShell (for Get-AuthenticodeSignature verification)
- js-yaml, crypto, fs, path modules

## Related Knowledge

See `windows_certificate_and_kms_provider_setup.md` for GCP/KMS configuration and `github_release_management_system.md` for release asset handling.