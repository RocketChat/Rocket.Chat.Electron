---
children_hash: e27732d5db77878cfda08b435aba46a4069959c66327343c8bbb597eb668ea0b
compression_ratio: 0.18000622858922455
condensation_order: 1
covers: [architecture/_index.md, build_pipeline.md, build_system/_index.md, configuration.md, configuration/_index.md, context.md, desktop_release_action.md, development_setup.md, installation.md, integrations/_index.md, internationalization/_index.md, main_process_lifecycle.md, notification_system_architecture.md, platform_support.md, platform_support/_index.md, project_overview.md, renderer_entry_points.md, rocket_chat_electron_documentation.md, rocket_chat_electron_overview.md, server_management/_index.md, shell_root_component.md, tech_stack.md, ui_components/_index.md]
covers_token_total: 16055
summary_level: d1
token_count: 2890
type: summary
---
# Rocket.Chat Electron Desktop Application

## Project Overview

Rocket.Chat Electron is an official Electron-based desktop client wrapping the Rocket.Chat web application with native desktop features. Built with TypeScript 5, React 18, Redux 5, Rollup 4, and Electron 40, it supports Windows 10+, macOS 12+ (Universal), and Linux Ubuntu 22.04+ (x64).

## Three-Layer Architecture

The application implements a strict three-layer separation of concerns:

**Layer 1: Main Process** (`src/main.ts`) — Orchestrates application lifecycle, handles server resolution, certificate trust validation, deep link parsing, and feature initialization. Follows strict initialization order: user data setup → system certificates → logging → GPU crash handler → app readiness → Redux store → data persistence → i18n → window creation → feature setup → UI setup.

**Layer 2: Redux Store** — Single source of truth using Flux Standard Actions (FSA) and memoized reselect selectors. Shared between main and renderer processes via IPC middleware with 60+ distinct channels for state, downloads, notifications, video, screen sharing, calendar, documents, and logging.

**Layer 3: Renderer/React** (`src/rootWindow.ts`, `src/preload.ts`) — Shell root component with SideBar and ServersView layout. Each server runs in a persistent webview managed by ReparentingContainer. Preload script bridges privileged APIs via `window.RocketChatDesktop`.

## Build System

**Rollup Bundling Pipeline** — Compiles three entry points (main.ts, rootWindow.ts, preload.ts) from `src/` to executable `app/` folder. Only `dependencies` (not `devDependencies`) included in distributable. Electron-builder packages output for target platforms into `dist/`.

**Asset Generation Pipeline** — Automates icon and installer asset generation via Puppeteer-rendered React SVG components:
- PNG rendering with GPU acceleration
- Platform-specific format conversion: macOS (@fiahfy/icns-convert → .icns), Windows (@fiahfy/ico-convert → multi-resolution .ico), Linux (Jimp → .png), Installers (Jimp → BMP)
- Generated assets stored in `src/public/images/` with platform-specific tray icons (macOS 24/48px, Windows 16-256px, Linux 64/128px), touch bar buttons, and installer assets

## Configuration System

**Auto-Update Management** — Three-layer configuration (app-level, user-level, defaults) with Redux state management. Channels: `latest` (stable), `beta`, `alpha`. Platform-specific flows: macOS (destroy windows → checkForUpdates → quitAndInstall), others (autoUpdater.quitAndInstall). Safeguards: version comparison prevents downgrades, production mode sets autoDownload=false.

**Server & Settings Configuration** — Two JSON files:
- `servers.json`: Server list (checked only on first launch or when all servers removed)
- `overridden-settings.json`: Settings overrides with precedence over defaults and user settings
- Platform-specific paths: Windows (%APPDATA%/Rocket.Chat/), macOS (~/Library/Application Support/Rocket.Chat/), Linux (~/.config/Rocket.Chat/)

## Integrations Subsystem (40+ Modules)

**IPC Communication** — Type-safe bidirectional channels via ChannelToArgsMap TypeScript union. Main→Renderer uses manual request-id protocol; Renderer→Main uses Electron's ipcRenderer.invoke(). Retry mechanism with configurable maxAttempts, retryDelay, and shouldRetry predicates.

**Security & Certificates** — SSL certificate trust cached by hostname with deduplication. Client certificates auto-select if single, prompt if multiple. External protocols validated against allowedList; intrinsic protocols (http, https, mailto) always allowed. System CA certificates loaded before app.whenReady() via tls.getCACertificates('system').

**Deep Links & Navigation** — Parses custom protocol ({protocol}://) and go URL shortener (https://{goUrlShortener}/). Supports four actions: auth (resumeToken), room (path validation), invite, conference. Resolves server URL with 100ms polling until available. Room path validation: `/^\/?(direct|group|channel|livechat)\/[0-9a-zA-Z-_.]+/`.

**Screen Sharing System** — FSA request/response pattern with meta.id tracking. Provider abstraction: PortalPickerProvider (Linux/Wayland via XDG portal) or InternalPickerProvider (custom React UI). Desktop capturer source caching with 3-second stale threshold. One-at-a-time requests via isPending flag with 60-second timeout.

**Video Call Window** — Dedicated window with webPreferences: nodeIntegration true, contextIsolation false, webviewTag enabled. Windows RDP detection disables WebRTC screen capture. Display media handler with custom picker (useSystemPicker: false). Global state tracks videoCallWindow, credentials, provider name. Lifecycle: store credentials → wait destruction → create window → load HTML → setup webview → set pending URL. Bounds fallback: 80% of nearest screen, centered.

**Downloads Management** — Tracked via itemId (Date.now()). State transitions: progressing → paused/completed/cancelled/interrupted/expired. S3 presigned URL expiry validation parses X-Amz-Date and X-Amz-Expires. Preferences persisted via ElectronStore. IPC handlers: pause, resume, cancel, retry, remove, clear-all, show-in-folder, copy-link.

**Logging System** — Multi-process pipeline: console override → context enrichment → privacy redaction → deduplication → file/IPC transport. IPC rate-limiting: 100 msgs/sec per webContents. Privacy redaction: field-based and pattern-based (Bearer tokens, emails, credit cards). File transport: async writes, 10MB rotation; Error JSONL: 5MB limit, 10s flush interval. Log format: [processType] [server?] [component?].

**Notifications System** — Electron Notification instances managed via three state maps. Icon resolution: data URLs directly; HTTP URLs converted to data URIs. Deduplication by tag. Event listeners dispatch: NOTIFICATIONS_NOTIFICATION_SHOWN, NOTIFICATIONS_NOTIFICATION_CLOSED, NOTIFICATIONS_NOTIFICATION_CLICKED, NOTIFICATIONS_NOTIFICATION_REPLIED, NOTIFICATIONS_NOTIFICATION_ACTIONED. Voice notifications trigger attention drawing (dock bounce on macOS, frame flash elsewhere).

**Internationalization** — I18nService singleton extends Service base class. System locale detection via app.getSystemLocale(); normalizes to BCP-47 format. Fallback chain: exact match → language prefix match → fallbackLng. 17 locales supported with dynamic import() for lazy loading. Custom formatters: bytes (compact notation), duration (relative time), percentage.

**Spell Checking** — Uses Electron's chromium built-in spell checker. setupSpellChecking() initializes with current languages and registers Redux action listeners. Language state: Set<string> of active language codes. Listeners: SPELL_CHECKING_TOGGLED (global), SPELL_CHECKING_LANGUAGE_TOGGLED (per-language). Applied to defaultSession and all active webContents.

**Sidebar Styling** — CSS custom property polling every 5 seconds from server webview preload context. Extracts sidebar background, color, and border via getComputedStyle(). Version-specific CSS classes: rcx-sidebar--main for 6.3.0+, sidebar for earlier. Dispatches WEBVIEW_SIDEBAR_STYLE_CHANGED to Redux store.

**User Presence & Power Monitoring** — Power monitor listeners for suspend and lock-screen events. IPC channel: power-monitor/get-system-idle-state. Redux action types: SYSTEM_SUSPENDING, SYSTEM_LOCKING_SCREEN. SystemIdleState values: active, idle, locked, unknown. Auto-away with configurable idle threshold; polling every 2 seconds when enabled.

**Outlook Calendar Integration** — EWS-based sync via ews-javascript-api and @ewsjs/xhr. Credential encryption via Electron safeStorage; plaintext fallback for legacy. Sync coalescing: queues subsequent syncs when one in progress. Duplicate detection by externalId. Supports insecure connections for air-gapped environments. Default sync interval: 60 minutes. Minimum Rocket.Chat version: 7.5.0. REST API endpoints: GET/POST calendar.events, POST calendar.events/import, POST calendar.events/update, POST calendar.events/delete.

## Server Management

**Server Loading & Persistence** — Loads from app-bundled configuration (servers.json in app path or macOS preferences), then user-stored servers from userData directory (deleted after loading to prevent duplication). Merges via setupServers() and applies sort order from localStorage. Persists via localStorage keys: rocket.chat.hosts, rocket.chat.currentHost, rocket.chat.sortOrder.

**Server URL Resolution** — Normalizes user input via convertToURL() (handles both https://example.com and example.com formats). Validates and resolves via resolveServerUrl() with server version checking. Enforces minimum >=2.0.0 (REQUIRED_SERVER_VERSION_RANGE). Returns status codes: INVALID_URL, TIMEOUT, INVALID, OK.

## UI Components

**Shell Root Component** — Flexbox column layout with TopBar (macOS only), SideBar, and content area. Theme resolution: if userThemePreference is "auto", use machineTheme; otherwise use userThemePreference. PaletteStyleTag applies theme to :root selector. Dynamic stylesheet loading for icons via appPath. Tooltip provider wraps entire tree.

**SideBar Component** — Vertical server navigation with drag-and-drop reordering, keyboard shortcuts (Cmd/Ctrl+1-9), server badges, and context menu. Uses three hooks: useServers, useSorting, useKeyboardShortcuts.

**ServersView & ServerPane** — Multi-server webview management using ReparentingContainer to preserve webview state during server switching. Lazy loading (src set only when shouldLoad true). Webview lifecycle: did-attach → dom-ready (300ms) → WEBVIEW_READY dispatch. Partition isolation per server (persist:${serverUrl}).

**AddServerView Component** — Form for adding new servers, conditionally rendered when currentView === "add-new-server". Async request/response pattern over Redux for URL validation. Validation states: idle → validating → invalid/ok. Monitors online/offline status with user-facing callout.

**Global CSS & Theming** — Universal `src/public/main.css` defines CSS custom properties (--rcx-color-*) for Fuselage design system tokens. Imported by all three HTML templates. Includes Fuselage CSS and GitHub Markdown CSS.

## Platform Support & Installation

**Supported Platforms:**
- Windows 10+ (x64, ia32, arm64) — NSIS, MSI installers; silent install via /S flag; per-user (/currentuser) or all-users (/allusers); disable auto-updates (/disableAutoUpdates)
- macOS 12+ (Universal x64 + Apple Silicon) — DMG, PKG, ZIP formats
- Linux Ubuntu 22.04+ (x64) — AppImage, deb, rpm, snap, tar.gz formats

**Distribution Channels:** GitHub Releases, Microsoft Store (Windows), Mac App Store (macOS), Snap Store (Linux)

## Development Setup

**Prerequisites:** Node.js >= 24.11.1, Yarn >= 4.0.2, Git. Build-essential and libxss-dev on Ubuntu/Debian; libX11-devel and libXScrnSaver-devel on Fedora/RHEL.

**Quick Start:** Clone repository → yarn install → yarn start. Source code automatically rebuilt on changes during development.

## Release Pipeline

**GitHub Action** (`workspaces/desktop-release-action/`) — Builds, signs, and publishes across all platforms. Triggered by push events on dev, master, or tag refs. Handles three release types: development (dev branch → edge Snapcraft channel), snapshot (master branch → edge channel), tagged releases (semantic versioning determines channel: stable, candidate, beta, edge). Manages asset cleanup at 900+ assets to prevent GitHub's 1000-asset limit. Requires platform-specific signing credentials: macOS (CSC cert, Apple ID), Windows (GCP KMS), GitHub token, Snapcraft token.