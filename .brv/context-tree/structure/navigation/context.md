# Topic: navigation

## Overview
Covers Electron certificate validation, client certificate selection, HTTP authentication, and external protocol permission handling. Manages trust state via Redux with persistence to app settings.

## Key Concepts
- Certificate serialization and fingerprint matching
- Trusted vs not-trusted certificate stores
- Client certificate selection dialog
- External protocol whitelisting
- HTTP authentication credential injection
- Concurrent request queuing with fingerprint deduplication

## Related Topics
- structure/redux_store - Redux state management
- electron_apps/rocketchat_desktop/ipc_communication_system - IPC for dialogs
