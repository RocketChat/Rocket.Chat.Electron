---
children_hash: af0d1bfe0a3d883ffcc88d238b9f1686c1f947089fd17250914792ddef4fe9a4
compression_ratio: 0.930841121495327
condensation_order: 2
covers: [context.md, rocketchat_desktop/_index.md]
covers_token_total: 3210
summary_level: d2
token_count: 2988
type: summary
---
# Rocket.Chat Electron Desktop Application - Structural Summary

## Domain Overview
The electron_apps domain contains knowledge about the Rocket.Chat Electron desktop client—an official Electron-based wrapper around the Rocket.Chat web application with native desktop features. Built with TypeScript 5, React 18, Redux 5, Rollup 4, and Electron 40; supports Windows 10+, macOS 12+ (Universal), and Linux Ubuntu 22.04+ (x64).

## Three-Layer Architecture

**Main Process** (`src/main.ts`)
- 9-stage lifecycle: user data setup → certificate management → logging → GPU crash handling → Redux store → data persistence → i18n → window creation → feature initialization
- Manages server resolution, certificate trust, deep link parsing
- Initializes 10+ feature modules (notifications, screen sharing, video calls, spell checking, updates, downloads, Outlook sync, etc.)
- Critical: GPU crash handler must run before app.whenReady()

**Redux Store** (`src/store/`)
- Single source of truth using Flux Standard Actions (FSA) and memoized reselect selectors
- Shared between main and renderer via IPC middleware
- Manages servers, downloads, notifications, UI views, theme, system integration

**Renderer/React** (`src/ui/components/`)
- Shell root component with SideBar and ServersView layout
- Persistent webviews per server managed by ReparentingContainer
- Views: ServersView, AddServerView, DownloadsManagerView, SettingsView

## Build System

**Rollup Pipeline**
- Entry points: main.ts, rootWindow.ts, preload.ts
- Flow: src/ → Rollup 4 → app/ → electron-builder → dist/
- Outputs: Windows (NSIS/MSI), macOS (DMG/PKG/ZIP), Linux (AppImage/deb/rpm/snap/tar.gz)
- Constraint: only `dependencies` included in distributable

**Asset Generation** (src/buildAssets.ts)
- SVG components → puppeteer (SVG→PNG) → platform converters (icns/ico/bmp)
- Platform-specific outputs: macOS (8 sizes + tray), Windows (installer + badge variants), Linux (8 sizes + tray)

## Configuration System

**Two-File Architecture**
- `servers.json`: Server list (checked on first launch or when all servers removed)
- `overridden-settings.json`: Settings with highest precedence

**Platform Paths**
- Windows: %APPDATA%/Rocket.Chat/ or Program Files/Rocket.Chat/Resources/
- macOS: ~/Library/Application Support/Rocket.Chat/ or /Library/Preferences/Rocket.Chat/
- Linux: ~/.config/Rocket.Chat/ or /opt/Rocket.Chat/resources/

**Auto-Update System**
- Three-layer config (app-level, user-level, defaults) with Redux state
- Channels: `latest` (stable), `beta`, `alpha` (allowPrerelease)
- Platform flows: macOS (native updater), Windows/Linux (quitAndInstall)
- Prevents downgrades; production mode sets autoDownload=false

## Integrations (40+ Modules)

**IPC Communication**
- Type-safe bidirectional via ChannelToArgsMap TypeScript union
- 60+ channels: state, downloads, notifications, video, screen sharing, calendar, documents, logging
- Retry mechanism (invokeWithRetry) with configurable maxAttempts, retryDelay, shouldRetry predicates
- Rule: all cross-process communication via Redux store, never direct ipcRenderer.invoke()

**Security & Certificates**
- SSL trust cached by hostname; deduplication via queuedTrustRequests Map
- System certificates loaded via tls.getCACertificates('system') before app.whenReady()
- External protocols validated against allowedList; intrinsic protocols always allowed
- Client certificate auto-selects if single, prompts if multiple

**Deep Links & Navigation**
- Parses custom protocol ({electronBuilderJsonInformation.protocol}://) and go URL shortener
- Four actions: auth (resumeToken), room (path validation), invite, conference
- Room path validation: /^\/?(direct|group|channel|livechat)\/[0-9a-zA-Z-_.]+/
- Allowed protocols: http, https, file, data, about; SMB blocked

**Screen Sharing**
- FSA request/response with meta.id tracking (one-at-a-time)
- Provider abstraction: PortalPickerProvider (Linux/Wayland) or InternalPickerProvider (custom React UI)
- Desktop capturer source caching with 3-second stale threshold
- macOS screen recording permission checking via systemPreferences.getMediaAccessStatus('screen')
- 60-second timeout with callback on source selection

**Video Call Window**
- Dedicated window with nodeIntegration true, contextIsolation false, webviewTag enabled
- Windows RDP detection disables WebRTC screen capture
- 18 async IPC channels for window management, media permissions, screen picker, credentials, language, cache
- Lifecycle: store credentials → wait destruction → close existing → calculate bounds → create → load HTML → setup webview
- Window bounds fallback: 80% of nearest screen, centered; persistence validates bounds inside some screen

**Downloads Management**
- Tracked via itemId (Date.now())
- State transitions: progressing → paused/completed/cancelled/interrupted/expired
- S3 presigned URL expiry validation: parses X-Amz-Date + X-Amz-Expires
- Preferences persisted via ElectronStore with lastDownloadDirectory tracking
- IPC handlers: pause, resume, cancel, retry, remove, clear-all, show-in-folder, copy-link

**Notifications System**
- Pipeline: console override → context enrichment → privacy redaction → deduplication → file/IPC transport
- Deduplication by tag; updates existing if tag matches
- Icon resolution: data URLs directly; HTTP URLs converted to data URIs
- Event listeners: NOTIFICATIONS_NOTIFICATION_SHOWN/CLOSED/CLICKED/REPLIED/ACTIONED
- Voice notifications trigger attention drawing (dock bounce on macOS, frame flash elsewhere)

**Logging System**
- Multi-process pipeline with IPC rate-limiting (100 msgs/sec per webContents)
- Component context detection via Error().stack inspection
- Privacy redaction: field-based and pattern-based (Bearer tokens, emails, credit cards)
- File transport: async writes, 10MB rotation; Error JSONL: 5MB limit, 10s flush interval
- Log file permissions: 0600 (owner-only); format: [processType] [server?] [component?]

**Internationalization**
- I18nService singleton extending Service base class with async initialization
- System locale detection via Electron app API with BCP-47 normalization
- Fallback chain: System locale → en-US → en
- React-i18next integration with lazy resource loading
- Custom formatters: bytes (compact notation), duration (relative time), percentage

**Spell Checking**
- Uses Electron's chromium built-in spell checker
- Language state: Set<string> of active language codes
- Listeners: SPELL_CHECKING_TOGGLED (global), SPELL_CHECKING_LANGUAGE_TOGGLED (individual)
- Applied to defaultSession and all active webContents

**Sidebar Styling**
- CSS custom property polling every 5 seconds from server webview preload
- Extracts sidebar background, color, border via getComputedStyle()
- Version-specific CSS classes: rcx-sidebar--main for 6.3.0+, sidebar for earlier
- Dispatches WEBVIEW_SIDEBAR_STYLE_CHANGED to Redux store

**User Presence & Power Monitoring**
- Power monitor listeners for suspend and lock-screen events
- IPC channel: power-monitor/get-system-idle-state
- Auto-away with configurable idle threshold; polling every 2 seconds when enabled
- Dispatches to Rocket.Chat server presence API (Meteor.call UserPresence:away/online)

**Outlook Calendar Integration**
- EWS-based sync via ews-javascript-api and @ewsjs/xhr
- Credential encryption via Electron safeStorage; plaintext fallback for legacy
- Sync coalescing: queues subsequent syncs when one in progress; executes only last queued
- Default sync interval: 60 minutes; configurable via UI or overridden-settings.json
- REST API endpoints: GET/POST calendar.events, import, update, delete

**Document & Log Viewing**
- Document viewer: server-scoped session partitions (persist:serverUrl) for authenticated fetching
- Protocol validation (http/https only); same-origin constraints
- Log viewer: centered BrowserWindow with file selection and custom viewing
- Secure file access: path traversal prevention, absolute paths only, .log/.txt extensions
- Log tailing with streaming from byte offset; export as ZIP archives

## Server Management

**Loading & Persistence**
- Loads from app-bundled servers.json and userData directory
- Merges sources via setupServers(); applies sort order from localStorage
- Persists via localStorage keys: `rocket.chat.hosts`, `rocket.chat.currentHost`, `rocket.chat.sortOrder`

**URL Resolution**
- Normalizes user input via convertToURL() (handles both `https://example.com` and `example.com`)
- Validates and resolves via resolveServerUrl() with server version checking
- Enforces minimum version >=2.0.0 (REQUIRED_SERVER_VERSION_RANGE)
- Status codes: INVALID_URL, TIMEOUT, INVALID, OK

## UI Components

**Shell Root** (`src/ui/components/Shell/index.tsx`)
- Flexbox column layout with TopBar (macOS only), SideBar, content area
- Theme resolution: auto-detection from machineTheme or userThemePreference override
- PaletteStyleTag applies theme to :root selector
- Modal dialogs: AboutDialog, ServerInfoModal, SupportedVersionDialog, ScreenSharingDialog, RootScreenSharePicker, SelectClientCertificateDialog, UpdateDialog, ClearCacheDialog, OutlookCredentialsDialog

**SideBar** (`src/ui/components/SideBar/`)
- Vertical server navigation with drag-and-drop reordering
- Keyboard shortcuts: Cmd/Ctrl+1-9 for server selection
- Server badges and context menu
- Hooks: useServers, useSorting, useKeyboardShortcuts

**ServersView & ServerPane**
- Multi-server webview management via ReparentingContainer (preserves webview state)
- Lazy loading (src set only when shouldLoad true)
- Lifecycle: did-attach → dom-ready (300ms) → WEBVIEW_READY dispatch
- Partition isolation per server (persist:${serverUrl})
- Overlays for document viewer, error handling, unsupported server states

**AddServerView**
- Form component for adding new servers
- Async request/response pattern over Redux for URL validation
- Validation states: idle → validating → invalid/ok
- Monitors online/offline status with user-facing callout

**Root Window** (`src/ui/components/Shell/index.tsx`)
- Main application window (1000x600) with transparent background and macOS vibrancy
- Loads index.html → rootWindow.js bundle
- Manages window state persistence, unread badges, platform-specific close behavior

**Global CSS & Theming**
- src/public/main.css (199 bytes) defines CSS custom properties (--rcx-color-*) for Fuselage design system tokens
- Imported by all three HTML templates
- Includes Fuselage CSS and GitHub Markdown CSS

**Public Assets** (`src/public/`)
- Static assets: HTML shells, CSS files (main.css, loading.css, error.css)
- Platform-specific images: tray icons with macOS Template suffix, Linux/Windows numeric badges 1-9, touch bar icons

## Installation & Release

**Platform Support**
- Windows 10+ (x64, ia32, arm64): NSIS, MSI installers
- macOS 12+ (Universal x64 + Apple Silicon): DMG, PKG, ZIP
- Linux Ubuntu 22.04+ (x64): AppImage, deb, rpm, snap, tar.gz

**Installation Methods**
- Windows silent install: `/S` flag; per-user (default): `/currentuser`; all-users (admin): `/allusers`; disable auto-updates: `/disableAutoUpdates`
- Distribution channels: GitHub Releases, Microsoft Store, Mac App Store, Snap Store

**Desktop Release Action** (GitHub Action)
- Builds native packages for all three platforms
- Signs code for macOS (notarization) and Windows (KMS)
- Publishes to GitHub Releases and Snapcraft
- Handles development, snapshot, and tagged releases
- Manages asset cleanup to prevent GitHub's 1000-asset limit
- Snapcraft channel determination: stable (no prerelease), candidate (prerelease[0]=candidate), beta (prerelease[0]=beta), edge (fallback)

## Development Setup

**Requirements**
- Node.js >= 24.11.1
- Yarn >= 4.0.2
- Git

**Quick Start**
- Clone repository → `yarn` → `yarn start`
- Source code automatically rebuilt on changes during development

**Testing**
- Jest testing framework with Jest electron runner
- Test files match glob: *.(spec|test).{js,ts,tsx}