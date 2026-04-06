---
children_hash: 63d73c72d45891aaeaff62d510e5eeb849e7f0051fcd068db815d9a1f586d876
compression_ratio: 0.5446985446985447
condensation_order: 1
covers: [windows_certificate_and_kms_provider_setup.md]
covers_token_total: 962
summary_level: d1
token_count: 524
type: summary
---
# Windows Certificate and KMS Provider Setup

## Overview
Implements Windows certificate handling and Google Cloud KMS CNG provider integration for code signing in CI/CD pipelines. Certificates are read from GitHub Actions secrets, installed to Windows stores, and used with jsign for post-build signing to avoid WiX MSI conflicts.

## Certificate Management Flow
1. **Input**: Read PEM certificates from GitHub Actions secrets (win_user_crt, win_intermediate_crt, win_root_crt)
2. **Storage**: Write certificates to `{RUNNER_TEMP}/codesigning` directory with UTF-8 encoding
3. **Installation**: Install certificate chain to Windows CurrentUser store (ROOT, CA, MY)
4. **Verification**: Compute SHA1 thumbprint (40 hex characters) and verify certificate existence and private key status
5. **Signing**: Use jsign for post-build signing instead of signtool.exe

## Key Components
- **src/windows/certificates.ts**: Five exported functions—addCertToStore, computeThumbprint, writeCertFromSecret, verifyCertificateInStore, setupCertificates
- **src/windows/kms-provider.ts**: installKmsCngProvider function for KMS integration

## Certificate Chain Requirements
- **Three-certificate chain required**: User certificate + intermediate + root for RFC3161 timestamp validation
- **KMS certificates**: Should NOT contain private keys; thumbprint provided via win_kms_cert_sha1 input or computed from certificate
- **Store scope**: CurrentUser store only (not machine-wide)

## KMS Integration
Google Cloud KMS CNG provider DLL enables signtool.exe to use KMS keys, but conflicts with WiX MSI builds. jsign is used as the alternative signing tool to avoid these conflicts.

## Critical Rules
- Certificates written to CurrentUser\My store via certutil
- SHA1 thumbprint required for certificate identification
- Empty secret values return empty string without error
- Directory creation is recursive
- Verification checks both certificate existence and private key status

## Dependencies
@actions/core, fs, path, PowerShell (Get-PfxCertificate, Get-ChildItem), certutil, Google Cloud KMS CNG provider DLL