---
title: Certificate Trust and Protocol Handling
tags: []
related: [structure/redux_store/redux_store_architecture.md, electron_apps/rocketchat_desktop/ipc_communication_system.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:20:53.675Z'
updatedAt: '2026-04-04T18:20:53.675Z'
---
## Raw Concept
**Task:**
Manage Electron certificate trust validation and external protocol permissions

**Changes:**
- Certificate-error event handler validates against trustedCertificates store
- select-client-certificate handler shows dialog when multiple certs available
- login event handler provides HTTP auth credentials from server URLs
- isProtocolAllowed function checks intrinsic and persisted external protocols

**Files:**
- src/navigation/actions.ts
- src/navigation/reducers.ts
- src/navigation/main.ts

**Flow:**
Electron session event -> check Redux store -> show dialog if needed -> dispatch action -> update state

**Timestamp:** 2026-04-04

## Narrative
### Structure
Navigation module has three layers: (1) Redux actions in actions.ts define 8 action types for certificates and protocols, (2) Three reducers manage clientCertificates, trustedCertificates, notTrustedCertificates, and externalProtocols state, (3) main.ts hooks Electron session events and provides setupNavigation() and isProtocolAllowed() exports

### Dependencies
Depends on Electron app session events (certificate-error, select-client-certificate, login), Redux store (dispatch, select, request), and dialog UI (askForCertificateTrust, askForOpeningExternalProtocol)

### Highlights
Certificate trust uses fingerprint-based deduplication with queuedTrustRequests Map to handle concurrent requests. External protocols support "remember this choice" via dontAskAgain flag. HTTP authentication auto-filled from server URLs when available.

### Rules
Rule 1: Certificates are serialized as issuerName\\ncertificate.data.toString() for comparison
Rule 2: Certificate trust state is persisted in app settings and loaded on startup
Rule 3: External protocol permissions default to http://, https://, mailto: (intrinsic protocols)
Rule 4: When multiple client certificates available, user must select one via dialog
Rule 5: Certificate-error events are prevented by default and require explicit callback(true/false)

### Examples
Example: Certificate error flow - Electron fires certificate-error -> check if serialized cert matches trustedCertificates[host] -> if yes callback(true) -> if no show dialog -> dispatch TRUSTED_CERTIFICATES_UPDATED or NOT_TRUSTED_CERTIFICATES_UPDATED

## Facts
- **module_location**: Navigation module located in src/navigation/ [project]
- **module_purpose**: Module manages certificate trust and external protocol permissions, NOT page-to-page navigation [project]
- **certificate_serialization**: Certificates are serialized as issuerName + certificate data [project]
- **trusted_certs_storage**: Trusted certificates stored as Record<Server['url'], Certificate['fingerprint']> [project]
- **cert_file_location**: User certificates loaded from certificate.json in app userData directory [project]
- **allowed_protocols**: Intrinsic protocols always allowed: http:, https:, mailto: [project]
