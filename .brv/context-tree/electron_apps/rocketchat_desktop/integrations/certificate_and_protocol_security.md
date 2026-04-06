---
title: Certificate and Protocol Security
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:31:19.348Z'
updatedAt: '2026-04-04T18:31:19.348Z'
---
## Raw Concept
**Task:**
Handle SSL certificate trust, client certificate selection, HTTP authentication, and external protocol permissions

**Changes:**
- Added setupNavigation() for certificate error handling
- Added certificate trust caching by hostname
- Added client certificate auto-selection and dialog
- Added HTTP authentication with server URL matching
- Added external protocol permission system

**Files:**
- src/navigation/main.ts

**Flow:**
Certificate error/select-client-certificate/login event → validate/prompt user → dispatch TRUSTED_CERTIFICATES_UPDATED/EXTERNAL_PROTOCOL_PERMISSION_UPDATED → store in Redux

**Timestamp:** 2026-04-04

## Narrative
### Structure
Certificate handling in src/navigation/main.ts manages three security concerns: SSL certificate trust (cached by hostname), client certificate selection (auto-select if single, prompt if multiple), and HTTP authentication (matches request host against server URLs). External protocols are validated against allowed list with user prompts.

### Dependencies
Listens to app.certificate-error, app.select-client-certificate, and app.login events. Loads user certificates from {userData}/certificate.json on startup. Stores trusted/untrusted certificates in Redux state. Deduplicates requests via queuedTrustRequests Map (keyed by fingerprint).

### Highlights
Certificate serialization: {issuerName}
{data.toString()}. Intrinsic protocols (http, https, mailto) are always allowed. External protocols stored in Redux externalProtocols (keyed by protocol). "Don't ask again" persists protocol permission.

### Rules
Rule 1: Certificate trust keyed by hostname (trustedCertificates[host], notTrustedCertificates[host])
Rule 2: Duplicate requests queued via queuedTrustRequests Map (keyed by fingerprint)
Rule 3: Client certificate auto-selects if single, prompts if multiple
Rule 4: HTTP auth matches request host against server URLs
Rule 5: Intrinsic protocols (http, https, mailto) always allowed
Rule 6: External protocol permissions stored in Redux externalProtocols
