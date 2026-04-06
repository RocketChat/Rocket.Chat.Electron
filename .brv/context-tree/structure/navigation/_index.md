---
children_hash: 1edf054ade7fb5360d70fc889da861aecd0deb2f946b5ab6ffac4314e33b1a55
compression_ratio: 0.5745118191161357
condensation_order: 1
covers: [certificate_trust_and_protocol_handling.md, context.md]
covers_token_total: 973
summary_level: d1
token_count: 559
type: summary
---
# Navigation Module: Certificate Trust and Protocol Handling

## Overview
The navigation module manages Electron certificate validation, client certificate selection, HTTP authentication, and external protocol permissions. It bridges Electron session events with Redux state management, persisting trust decisions to app settings.

## Architecture

**Three-layer structure:**
1. **Actions** (actions.ts) — 8 action types for certificate and protocol events
2. **Reducers** (reducers.ts) — State management for clientCertificates, trustedCertificates, notTrustedCertificates, externalProtocols
3. **Main handler** (main.ts) — Hooks Electron session events; exports setupNavigation() and isProtocolAllowed()

## Certificate Trust Flow

Electron session event → Redux store lookup → dialog if needed → action dispatch → state update

**Key mechanisms:**
- Certificates serialized as `issuerName\ncertificate.data.toString()` for fingerprint matching
- Fingerprint-based deduplication via queuedTrustRequests Map handles concurrent requests
- Trust state persisted in app settings, loaded on startup
- Trusted certs stored as `Record<Server['url'], Certificate['fingerprint']>`

**Rules:**
- Certificate-error events prevented by default; require explicit callback(true/false)
- Multiple client certificates trigger user selection dialog
- User certificates loaded from certificate.json in app userData directory

## External Protocol Handling

**Intrinsic protocols** (always allowed): http:, https:, mailto:

**Permission model:**
- isProtocolAllowed() checks both intrinsic and persisted external protocols
- "Remember this choice" via dontAskAgain flag
- Permissions validated against externalProtocols state

## HTTP Authentication

Auto-fills credentials from server URLs when available during login events.

## Dependencies
- Electron app session events (certificate-error, select-client-certificate, login)
- Redux store (dispatch, select, request)
- Dialog UI (askForCertificateTrust, askForOpeningExternalProtocol)

**Related modules:** structure/redux_store (state management), electron_apps/rocketchat_desktop/ipc_communication_system (dialog IPC)

**See:** certificate_trust_and_protocol_handling.md for implementation details