---
children_hash: 1d5a9a15700f557fc5f498da4dc0b7d6b75baa06f0a1196b450fc82520ec8bb6
compression_ratio: 0.38475373547315994
condensation_order: 3
covers: [ci_cd/_index.md, electron_apps/_index.md, structure/_index.md]
covers_token_total: 7228
summary_level: d3
token_count: 2781
type: summary
---
# Rocket.Chat Electron: Structural Summary (Level 3)

## Domain Architecture Overview

The Rocket.Chat Electron desktop application is organized into three primary domains:

- **ci_cd**: GitHub Actions workflows, build automation, and release processes across Linux, macOS, and Windows
- **electron_apps**: The Rocket.Chat Electron client application with three-layer architecture (Main Process, Redux Store, Renderer/React)
- **structure**: Core infrastructure including Redux store, app bootstrap, CI/CD pipelines, configuration, error handling, navigation security, and server management

## Three-Layer Application Architecture

### Main Process (`src/main.ts`)
9-stage lifecycle: user data setup → certificate management → logging → GPU crash handling → Redux store → data persistence → i18n → window creation → feature initialization. Manages server resolution, certificate trust, deep link parsing, and initializes 10+ feature modules (notifications, screen sharing, video calls, spell checking, updates, downloads, Outlook sync).

### Redux Store (`src/store/`)
Single source of truth using Flux Standard Actions (FSA) with ~50 reducer slices across 10 functional domains. IPC middleware synchronizes state between main and renderer processes via action scoping (LOCAL, SINGLE, broadcast). 100+ UI action types with exhaustive type checking. Memoized selectors via reselect prevent unnecessary re-renders.

### Renderer/React (`src/ui/components/`)
Shell root component with SideBar and ServersView layout. Persistent webviews per server managed by ReparentingContainer. Views: ServersView, AddServerView, DownloadsManagerView, SettingsView.

## Build System & Release Pipeline

**Rollup Pipeline**: src/ → Rollup 4 → app/ → electron-builder → dist/ (Windows NSIS/MSI, macOS DMG/PKG/ZIP, Linux AppImage/deb/rpm/snap/tar.gz)

**Release Types**:
- Development (refs/heads/dev): Draft releases, edge snap channel
- Snapshot (refs/heads/master): Draft releases, edge snap channel
- Tagged (semver): Published releases with channel routing based on prerelease status

**Platform-Specific Signing**:
- **macOS**: Universal binary (Intel + Apple Silicon), enforced notarization via Apple notarytool, requires CSC_LINK/CSC_KEY_PASSWORD/APPLEID/ASC_PROVIDER
- **Windows**: Two-phase signing (jsign pre-build + KMS CNG post-build), three-certificate chain, post-signing SHA512 checksum updates for auto-updater
- **Linux**: Multi-format packaging (tar.gz, deb, rpm, snap, AppImage), cumulative Snapcraft channel promotion (edge → beta → candidate → stable)

**Asset Management**: Cleanup triggers at 900+ assets (GitHub 1000-asset limit). Blockmap files enable delta updates. YAML manifests provide electron-builder auto-updater metadata.

## Server Management & Configuration

**Multi-Source Loading**: Merges app-bundled servers.json with userData directory, applies localStorage sort order, persists via localStorage keys (rocket.chat.hosts, rocket.chat.currentHost, rocket.chat.sortOrder).

**URL Resolution**: convertToURL() normalizes input, resolveServerUrl() validates and fetches server info, enforces minimum version >=2.0.0.

**Configuration System**: Two-file architecture (servers.json for server list, overridden-settings.json for settings with highest precedence). Platform-specific paths: Windows %APPDATA%/Rocket.Chat/, macOS ~/Library/Application Support/Rocket.Chat/, Linux ~/.config/Rocket.Chat/.

## Integration Subsystems (40+ Modules)

**IPC Communication**: Type-safe bidirectional via ChannelToArgsMap TypeScript union. 60+ channels with retry mechanism (invokeWithRetry) supporting configurable maxAttempts, retryDelay, shouldRetry predicates. Rule: all cross-process communication via Redux store.

**Security & Certificates**: SSL trust cached by hostname with deduplication via queuedTrustRequests Map. System certificates loaded via tls.getCACertificates('system'). External protocols validated against allowedList; intrinsic protocols always allowed.

**Deep Links & Navigation**: Parses custom protocol and go URL shortener. Four actions: auth (resumeToken), room (path validation), invite, conference. Room path validation: /^\/?(direct|group|channel|livechat)\/[0-9a-zA-Z-_.]+/

**Screen Sharing**: FSA request/response with meta.id tracking. Provider abstraction: PortalPickerProvider (Linux/Wayland) or InternalPickerProvider (custom React UI). Desktop capturer source caching with 3-second stale threshold. 60-second timeout with callback on source selection.

**Video Call Window**: Dedicated window with nodeIntegration true, contextIsolation false, webviewTag enabled. 18 async IPC channels for window management, media permissions, screen picker, credentials, language, cache. Lifecycle: store credentials → wait destruction → close existing → calculate bounds → create → load HTML → setup webview.

**Downloads Management**: Tracked via itemId (Date.now()). State transitions: progressing → paused/completed/cancelled/interrupted/expired. S3 presigned URL expiry validation via X-Amz-Date + X-Amz-Expires. Preferences persisted via ElectronStore with lastDownloadDirectory tracking.

**Notifications System**: Pipeline: console override → context enrichment → privacy redaction → deduplication → file/IPC transport. Deduplication by tag. Icon resolution: data URLs directly; HTTP URLs converted to data URIs.

**Logging System**: Multi-process pipeline with IPC rate-limiting (100 msgs/sec per webContents). Component context detection via Error().stack inspection. Privacy redaction: field-based and pattern-based (Bearer tokens, emails, credit cards). File transport: async writes, 10MB rotation; Error JSONL: 5MB limit, 10s flush interval.

**Internationalization**: I18nService singleton with system locale detection via Electron app API and BCP-47 normalization. Fallback chain: System locale → en-US → en. React-i18next integration with lazy resource loading.

**Spell Checking**: Uses Electron's chromium built-in spell checker. Language state: Set<string> of active language codes. Applied to defaultSession and all active webContents.

**Sidebar Styling**: CSS custom property polling every 5 seconds from server webview preload. Extracts sidebar background, color, border via getComputedStyle(). Version-specific CSS classes: rcx-sidebar--main for 6.3.0+, sidebar for earlier.

**User Presence & Power Monitoring**: Power monitor listeners for suspend and lock-screen events. Auto-away with configurable idle threshold; polling every 2 seconds when enabled.

**Outlook Calendar Integration**: EWS-based sync via ews-javascript-api. Credential encryption via Electron safeStorage. Sync coalescing: queues subsequent syncs when one in progress. Default sync interval: 60 minutes.

**Document & Log Viewing**: Document viewer uses server-scoped session partitions for authenticated fetching. Log viewer: centered BrowserWindow with file selection and custom viewing. Secure file access: path traversal prevention, absolute paths only, .log/.txt extensions.

## UI Component Structure

**Shell Root** (`src/ui/components/Shell/index.tsx`): Flexbox column layout with TopBar (macOS only), SideBar, content area. Theme resolution: auto-detection from machineTheme or userThemePreference override. Modal dialogs: AboutDialog, ServerInfoModal, SupportedVersionDialog, ScreenSharingDialog, RootScreenSharePicker, SelectClientCertificateDialog, UpdateDialog, ClearCacheDialog, OutlookCredentialsDialog.

**SideBar**: Vertical server navigation with drag-and-drop reordering. Keyboard shortcuts: Cmd/Ctrl+1-9 for server selection. Server badges and context menu.

**ServersView & ServerPane**: Multi-server webview management via ReparentingContainer (preserves webview state). Lazy loading. Lifecycle: did-attach → dom-ready (300ms) → WEBVIEW_READY dispatch. Partition isolation per server (persist:${serverUrl}).

**AddServerView**: Form component for adding new servers. Async request/response pattern over Redux for URL validation. Validation states: idle → validating → invalid/ok.

**Global CSS & Theming**: src/public/main.css defines CSS custom properties (--rcx-color-*) for Fuselage design system tokens. Imported by all three HTML templates.

## Error Handling & Navigation

**Error Pipeline**: setupMainErrorHandling() and setupRendererErrorHandling(windowName) register handlers for uncaught exceptions and unhandled rejections. Critical error detection via pluggable matcher (default: FATAL|Cannot access native module|Electron internal error). Bugsnag integration conditional on BUGSNAG_API_KEY with Redux opt-in toggle.

**Certificate Trust Flow**: Fingerprint-based deduplication via queuedTrustRequests Map handles concurrent requests. Trust state persisted in app settings, loaded on startup. Trusted certs stored as Record<Server['url'], Certificate['fingerprint']>.

**External Protocol Handling**: Intrinsic protocols (always allowed): http:, https:, mailto:. isProtocolAllowed() checks both intrinsic and persisted external protocols. "Remember this choice" via dontAskAgain flag.

## Platform Support & Installation

**Supported Platforms**:
- Windows 10+ (x64, ia32, arm64): NSIS, MSI installers
- macOS 12+ (Universal x64 + Apple Silicon): DMG, PKG, ZIP
- Linux Ubuntu 22.04+ (x64): AppImage, deb, rpm, snap, tar.gz

**Installation Methods**: Windows silent install via `/S` flag; per-user (default) vs all-users (admin) via `/currentuser`/`/allusers`; disable auto-updates via `/disableAutoUpdates`. Distribution channels: GitHub Releases, Microsoft Store, Mac App Store, Snap Store.

## Key Architectural Decisions

1. **FSA-based Redux** with type-safe action-to-payload mapping and exhaustive type checking
2. **IPC middleware synchronization** prevents infinite loops via action scoping (LOCAL, SINGLE, broadcast)
3. **Two-Phase Windows Signing**: jsign pre-build + KMS CNG post-build avoids WiX MSI conflicts
4. **Cumulative Snap Channel Promotion**: Snaps propagate systematically through release pipeline
5. **Post-build Signing Separation**: Avoids tool conflicts and enables independent verification
6. **Fingerprint-based Certificate Deduplication**: Handles concurrent trust requests
7. **Platform-specific Initialization**: Via environment variable detection (RDP, Wayland, GPU crashes)
8. **Memoized Selectors**: Via reselect prevent unnecessary re-renders
9. **Request-Response Utility**: Implements Promise-based async patterns with auto-cleanup
10. **Service Base Class**: Provides lifecycle management with auto-unsubscribe

## Critical Constraints

- Only processes push events (warns on other triggers)
- Tagged releases update draft releases only (prevents overwriting published)
- Spotlight indexing must be disabled before macOS DMG generation
- KMS CNG provider installed **after** electron-builder (not before)
- All three platforms upload to same GitHub release
- Signature verification required after each Windows signing phase
- GPU crash handler must run before app.whenReady()
- Windows RDP detection via SESSIONNAME env var forces screen capture fallback
- Wayland detection via XDG_SESSION_TYPE and socket validation for Linux