---
title: Windows Certificate and KMS Provider Setup
tags: []
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:51:06.338Z'
updatedAt: '2026-04-04T18:56:55.634Z'
---
## Raw Concept
**Task:**
Implement Windows certificate handling and Google Cloud KMS CNG provider integration for code signing

**Changes:**
- Reads PEM content from GitHub Actions inputs (win_user_crt, win_intermediate_crt, win_root_crt)
- Writes certificates to temporary files in RUNNER_TEMP/codesigning directory
- Installs certificates to Windows certificate stores (ROOT, CA, MY)
- Computes SHA1 thumbprint from certificate or uses provided win_kms_cert_sha1
- Installs Google Cloud KMS CNG provider DLL for signtool.exe integration
- Uses jsign for post-build signing instead of signtool due to WiX MSI conflicts

**Flow:**
Read PEM from secrets -> Write to temp files -> Install to Windows stores -> Compute/verify thumbprint -> Install KMS CNG provider -> Use jsign for signing

**Timestamp:** 2026-04-04

**Patterns:**
- `[A-Fa-f0-9]{40}` (flags: i) - SHA1 thumbprint format for Windows certificate identification (40 hex characters)

## Narrative
### Structure
Certificate handling is implemented in src/windows/certificates.ts with five exported functions: addCertToStore, computeThumbprint, writeCertFromSecret, verifyCertificateInStore, and setupCertificates. KMS provider setup is in src/windows/kms-provider.ts via installKmsCngProvider function.

### Dependencies
Requires @actions/core for GitHub Actions integration, fs and path for file operations, PowerShell for certificate operations (Get-PfxCertificate, Get-ChildItem), certutil for certificate store operations, Google Cloud KMS CNG provider DLL. RFC3161 timestamp validation requires complete certificate chain.

### Highlights
Certificate chain (user + intermediate + root) needed for RFC3161 timestamp validation. KMS CNG provider lets signtool.exe use KMS keys but conflicts with WiX MSI builds. jsign is used for actual post-build signing to avoid WiX conflicts. Certificates without private keys are expected for KMS integration.

### Rules
Rule 1: Certificate files are written to {RUNNER_TEMP}/codesigning directory with UTF-8 encoding
Rule 2: Certificates are installed to CurrentUser store (not machine-wide) using certutil
Rule 3: SHA1 thumbprint is required - computed from certificate or provided via win_kms_cert_sha1 input
Rule 4: Verification checks both certificate existence and private key status
Rule 5: Empty secretValue returns empty string without throwing error
Rule 6: KMS-based certificates should NOT have private keys
Rule 7: Directory creation is recursive if codesigning directory does not exist

### Examples
Example: writeCertFromSecret(base64CertContent, "user.crt") creates {RUNNER_TEMP}/codesigning/user.crt. Example: addCertToStore("MY", userCertPath, true) installs to CurrentUser\My store. Example: verifyCertificateInStore uses PowerShell Get-ChildItem with Thumbprint filter to locate certificate in Cert:\CurrentUser\My store.

### Diagrams
**Certificate Setup Flow**
```
Read PEM → Write to temp → Install to stores → Compute thumbprint → Verify installation → Check private key
```

## Facts
- **certificate_storage_location**: Certificates are stored in {RUNNER_TEMP}/codesigning directory [project]
- **certificate_chain_requirement**: Three certificates are required: user, intermediate, and root [project]
- **thumbprint_computation**: SHA1 thumbprint is computed via PowerShell Get-PfxCertificate [project]
- **certificate_store_scope**: Certificates are installed to CurrentUser store, not machine-wide [project]
- **kms_private_key_expectation**: KMS certificates should not have private keys [project]
- **signing_tool_choice**: jsign is used for signing instead of signtool due to WiX MSI conflicts [project]
