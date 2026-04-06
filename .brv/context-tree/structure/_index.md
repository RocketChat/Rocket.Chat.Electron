---
children_hash: 9d67ea644ca55456faaf8c1a7c3c0546e1a55030752993d5c4018844fa9a4f25
compression_ratio: 0.43358913813459266
condensation_order: 2
covers: [app_module/_index.md, ci_cd/_index.md, configuration/_index.md, error_handling/_index.md, navigation/_index.md, redux_store/_index.md, server_management/_index.md]
covers_token_total: 6776
summary_level: d2
token_count: 2938
type: summary
---
# Structure Domain: Core Application Infrastructure

## Overview
The structure domain encompasses the foundational Redux store architecture, application bootstrap logic, CI/CD pipeline infrastructure, configuration management, error handling, navigation security, and server management systems that power the Rocket.Chat Electron desktop client.

## Core Subsystems

### App Module (app_module/)
Bootstrap and Redux state management for Electron lifecycle, platform-specific initialization, and persistent settings.

**Key Components:**
- Redux actions (APP_* prefix), 41+ memoized selectors via reselect, state type definitions (PersistableValues)
- Bootstrap flow: performElectronStartup() → setupApp() → setupGpuCrashHandler() (Linux) → initializeScreenCaptureFallbackState()
- Platform-specific handling: Windows RDP detection via SESSIONNAME env var forces screen capture fallback; Linux GPU crash handler relaunches with --disable-gpu; Wayland detection via XDG_SESSION_TYPE and socket validation
- Settings management: OverrideOnlySettings loaded from overridden-settings.json; naming conventions (APP_* actions, is*Enabled flags)

**See:** app_actions_and_state_selectors.md, app_module_bootstrap.md

### Redux Store (redux_store/)
Centralized Flux Standard Action (FSA) pattern store synchronized across main and renderer processes via IPC middleware.

**Architecture:**
- RootState combines ~50 reducer slices across 10 functional domains: app core, server management, navigation/security, downloads, updates, UI flags, window state, video calls, Outlook integration, other
- FSA validation: 9 type guard predicates (isFSA, hasMeta, isResponse, isRequest, isLocallyScoped, isSingleScoped, isErrored, hasPayload, isResponseTo)
- 100+ UI action types organized by namespace (ABOUT_DIALOG_*, ADD_SERVER_*, MENU_BAR_*, etc.) with exhaustive type checking via UiActionTypeToPayloadMap
- Memoized selectors via reselect (selectGlobalBadge, selectGlobalBadgeText, selectGlobalBadgeCount)

**IPC Synchronization:**
- forwardToRenderers middleware in main process maintains Set<WebContents> of active renderers
- forwardToMain middleware in renderer process dispatches incoming actions
- Action scoping prevents loops: LOCAL stays in process, SINGLE targets specific webContents, default broadcasts to all renderers
- Renderers auto-register on "redux/get-initial-state" IPC and auto-cleanup on WebContents destroyed

**Async Patterns:**
- request(requestAction, ...types) generates unique ID, sets up listener, dispatches with request meta, returns Promise
- Download state management: Record<itemId, Download> with CREATED/UPDATED/REMOVED/CLEARED actions
- Service base class provides lifecycle hooks (initialize/destroy) with auto-cleanup of watch/listen subscriptions

**Public API:** dispatch(), select(), safeSelect(), watch(), listen(), request()

**See:** redux_store_architecture.md, fsa_type_system_and_validation.md, ipc_middleware_synchronization.md, request_response_utility.md

### Server Management (server_management/)
Multi-source server configuration, state persistence, and URL resolution.

**Lifecycle:**
- setupServers() initializes on app startup, listening for SERVER_URL_RESOLUTION_REQUESTED and WEBVIEW_GIT_COMMIT_HASH_CHECK actions
- loadAppServers() reads admin-configured servers from servers.json (platform-specific paths)
- loadUserServers() reads user-configured servers from userData/servers.json
- Merges configs, applies localStorage sorting via rocket.chat.sortOrder, dispatches SERVERS_LOADED
- Fallback support for localStorage rocket.chat.hosts and rocket.chat.currentHost

**Server State:**
- Server type requires url field; 20+ optional properties (title, pageTitle, badge, favicon, style, customTheme, lastPath, failed, webContentsId, userLoggedIn, gitCommitHash, version, uniqueID, isSupportedVersion, supportedVersions, outlookCredentials)
- ServerUrlResolutionStatus enum: OK, INVALID_URL, TIMEOUT, INVALID
- Redux reducer handles 20+ action types; upsert() adds/updates by URL; update() modifies existing only

**URL Resolution:**
- convertToURL() normalizes with protocol/port defaults (HTTP: 80, HTTPS: 443)
- resolveServerUrl() validates and fetches server info via IPC
- fetchServerInformation() retrieves version (requires >=2.0.0)
- Subdomain fallback via urls.rocketchat.subdomain()

**See:** server_lifecycle_and_loading.md, server_state_and_types.md, server_url_resolution.md

### CI/CD Pipeline (ci_cd/)
Multi-platform build automation, code signing, artifact management, and release distribution.

**Core Workflows:**
- build_release_workflow: 3-OS matrix (Ubuntu, macOS, Windows), Node.js 24.11.1, platform-specific signing (macOS CSC notarization S6UPZG7ZR3, Windows Google Cloud KMS via jsign, Linux Snapcraft), concurrent run cancellation per workflow + ref
- pull_request_validation_workflow: lint → test → build (NODE_ENV=production) → smoke-test executables (30-second timeout), xvfb-run on Linux, tests both mac and mac-arm64 bundles on macOS
- pull_request_build_workflow: requires build-artifacts label, multi-platform builds with code signing, Wasabi S3 upload with public-read ACL, macOS CSC_FOR_PULL_REQUEST=true, Windows KMS provider cached, Linux snap edge channel
- powershell_linting_workflow: path-filtered on .ps1/.psm1/.psd1 changes, PSScriptAnalyzer from PSGallery, excludes PSAvoidUsingWriteHost rule

**Release Routing:**
- Development (refs/heads/dev): rolling "development" GitHub release, snap edge channel
- Snapshot (refs/heads/master): rolling "snapshot" GitHub release, snap edge channel
- Tagged (semantic version tags): draft release per version, snap channel derived from prerelease field (no prerelease → stable, candidate → candidate, beta → beta, else → edge)

**Asset Management:**
- Force clean removes 100 oldest assets when count exceeds 900 (90% capacity threshold)
- Stale cleanup removes assets not in current build's expected asset names
- Platform-specific uploads: Linux (latest-linux.yml, *.tar.gz, *.snap, *.deb, *.rpm, *.AppImage), macOS (latest-mac.yml, *.pkg, *.zip, *.dmg, *.dmg.blockmap, mas-universal/*.pkg), Windows (latest.yml, *.appx, *.msi, *.exe, *.exe.blockmap)
- YAML files are electron-builder auto-updater manifests; blockmap files enable delta updates

**Windows Signing Pipeline:**
- Four-phase architecture: Setup → Build → Post-build signing → Verification
- Two-phase approach separates setup from electron-builder to avoid CNG provider conflicts
- Uses jsign (Java-based) instead of KMS CNG provider
- Supports NSIS, MSI, AppX installers; x64, ia32, arm64 architectures
- Automatic SHA512 checksum updates in latest.yml for auto-update system
- Verification via PowerShell Get-AuthenticodeSignature

**Linux Snapcraft:**
- setupSnapcraft() installs snapcraft via snap package manager (--classic --channel stable)
- packOnLinux() builds tar.gz, deb, rpm, snap, AppImage via electron-builder
- uploadSnap() cumulative channel promotion: given level="beta", uploads to both "edge" and "beta"; channel order: edge → beta → candidate → stable

**See:** build_release_workflow.md, desktop_release_action_routing_logic.md, github_release_asset_cleanup_and_limit_management.md, windows_signing_pipeline.md, linux_build_and_snapcraft_publishing.md

### Configuration (configuration/)
Centralized URL constants and builders for external service endpoints.

**Core Module:** src/urls.ts exports const-typed URL builders using "as const" for literal type inference

**URL Builders:**
- rocketchat: site and subdomain builder (e.g., "https://open.rocket.chat")
- server(serverUrl): generic builder for server-specific API endpoints
- supportedVersions({domain, uniqueId}): releases URL with query parameters
- docs: documentation and issue tracking URLs

**API Endpoints:** Calendar events (list, import, update, delete), public settings API (uniqueID, custom settings queries), server-relative endpoints (/api/v1/settings.public)

**See:** url_constants_module.md

### Error Handling (error_handling/)
Centralized error handling pipeline for main and renderer processes with critical error detection and Bugsnag integration.

**Setup Functions:**
- setupMainErrorHandling(): registers main process handlers and Bugsnag listener
- setupRendererErrorHandling(windowName): registers renderer process handlers for window.onerror and window.onunhandledrejection
- Both idempotent (guarded by _globalHandlersBound flag)

**Error Flow:** Uncaught exception/unhandled rejection → log to console → notify Bugsnag (if enabled) → call app.quit() if critical

**Critical Error Detection:**
- Default patterns: FATAL|Cannot access native module|Electron internal error
- Pluggable via setCriticalErrorMatcher(fn) with cleanup/restore pattern
- Triggers immediate app.quit() with no recovery

**Bugsnag Integration:**
- Conditional on BUGSNAG_API_KEY environment variable
- Dynamic toggle via Redux SETTINGS_SET_REPORT_OPT_IN_CHANGED action
- Deferred initialization if app version unavailable
- Path redaction (/\/Users\/[^\/]+/) for privacy

**See:** global_error_handling_system.md

### Navigation (navigation/)
Certificate validation, client certificate selection, HTTP authentication, and external protocol permissions.

**Three-layer Structure:**
- Actions: 8 action types for certificate and protocol events
- Reducers: state management for clientCertificates, trustedCertificates, notTrustedCertificates, externalProtocols
- Main handler: hooks Electron session events; exports setupNavigation() and isProtocolAllowed()

**Certificate Trust Flow:**
- Certificates serialized as issuerName\ncertificate.data.toString() for fingerprint matching
- Fingerprint-based deduplication via queuedTrustRequests Map handles concurrent requests
- Trust state persisted in app settings, loaded on startup
- Trusted certs stored as Record<Server['url'], Certificate['fingerprint']>

**External Protocol Handling:**
- Intrinsic protocols (always allowed): http:, https:, mailto:
- isProtocolAllowed() checks both intrinsic and persisted external protocols
- "Remember this choice" via dontAskAgain flag

**HTTP Authentication:** Auto-fills credentials from server URLs during login events

**See:** certificate_trust_and_protocol_handling.md

## Key Architectural Patterns

- **FSA-based Redux** with type-safe action-to-payload mapping and exhaustive type checking
- **IPC middleware synchronization** prevents infinite loops via action scoping (LOCAL, SINGLE, broadcast)
- **Memoized selectors** via reselect prevent unnecessary re-renders
- **Request-response utility** implements Promise-based async patterns with auto-cleanup
- **Service base class** provides lifecycle management with auto-unsubscribe
- **Multi-platform CI/CD** with fail-fast disabled for visibility into all platform failures
- **Concurrent run cancellation** per workflow + ref prevents duplicate builds
- **Post-build signing separation** avoids tool conflicts and enables independent verification
- **Cumulative snap channel promotion** enables staged rollouts (edge → beta → candidate → stable)
- **Fingerprint-based certificate deduplication** handles concurrent trust requests
- **Platform-specific initialization** via environment variable detection (RDP, Wayland, GPU crashes)

## Cross-Domain Dependencies

- App module depends on Redux store for state management and action dispatching
- Server management uses Redux store for state persistence and IPC synchronization
- Navigation module persists trust decisions to app settings via Redux
- Error handling integrates with Redux for opt-in state and Bugsnag reporting
- CI/CD pipelines depend on configuration (URLs, signing credentials, artifact paths)
- All modules rely on Electron lifecycle events and session management