---
children_hash: 7f05fedaa67a1499422091fd65f289353f79e3971ef11e051dc2d60eb2949a81
compression_ratio: 0.16673183022720361
condensation_order: 0
covers: [certificate_and_protocol_security.md, cross_system_architecture_patterns.md, data_flow_server_selection_and_badge_updates.md, deep_links_protocol_handling.md, desktop_capturer_source_caching.md, document_viewer_ipc_system.md, downloads_system_architecture.md, downloads_system_ipc_handlers_and_s3_expiration.md, i18n_system_language_detection_and_initialization.md, ipc_channel_definitions.md, ipc_communication_system.md, ipc_main_process_implementation.md, ipc_renderer_process_implementation.md, ipc_retry_options_interface.md, jitsi_screen_capture_integration.md, log_viewer_window.md, logging_system_architecture.md, notifications_system_architecture.md, outlook_calendar_integration.md, preload_api_bridge.md, root_window_icon_and_server_info_management.md, screen_picker_provider_abstraction.md, screen_recording_permission_handling.md, screen_sharing_ipc_channels.md, screen_sharing_request_lifecycle.md, screen_sharing_system_architecture.md, sidebar_style_polling_system.md, spell_checking_system.md, spell_checking_system_language_management.md, system_certificates_integration.md, updates_system_configuration_and_flow.md, user_presence_system.md, video_call_window_configuration_and_webpreferences.md, video_call_window_display_media_and_screen_sharing.md, video_call_window_html_template_structure.md, video_call_window_ipc_channels.md, video_call_window_ipc_system.md, video_call_window_lifecycle_and_state_management.md, video_call_window_navigation_and_protocol_security.md]
covers_token_total: 23019
summary_level: d0
token_count: 3838
type: summary
---
# Rocket.Chat Desktop Integrations System

## Overview

The Rocket.Chat Desktop integrations subsystem spans 40+ specialized modules handling cross-process communication, security, media, and system integration. All components follow a unified three-layer architecture (main.ts + preload.ts + renderer.ts) with Redux-driven IPC communication and Flux Standard Actions (FSA).

## Core Communication Patterns

**IPC Architecture** (ipc_communication_system.md, ipc_channel_definitions.md)
- Type-safe bidirectional communication via ChannelToArgsMap TypeScript union
- Main→Renderer: manual request-id protocol with ipcMain.once() listeners
- Renderer→Main: Electron built-in ipcRenderer.invoke() with automatic error serialization
- 60+ distinct channels covering state, downloads, notifications, video, screen sharing, calendar, documents, and logging
- Retry mechanism (invokeWithRetry) with configurable maxAttempts, retryDelay, and custom shouldRetry predicates

**Cross-System Patterns** (cross_system_architecture_patterns.md)
- Service class pattern: extends base Service with lifecycle hooks (setUp, tearDown), protected helpers (listen, dispatch, select)
- Action Type Maps: each subsystem exports ActionTypeToPayloadMap interface for typed FSA payloads
- Rule: all cross-process communication flows through Redux store, never direct ipcRenderer.invoke()

## Security & Certificates

**Certificate Management** (certificate_and_protocol_security.md)
- SSL certificate trust cached by hostname with deduplication via queuedTrustRequests Map (keyed by fingerprint)
- Client certificate auto-selects if single, prompts if multiple
- HTTP authentication matches request host against server URLs
- External protocols validated against allowedList with user prompts; intrinsic protocols (http, https, mailto) always allowed
- Serialization format: {issuerName}\n{data.toString()}

**System Certificates** (system_certificates_integration.md)
- Loads OS trust store CA certificates before app.whenReady() via tls.getCACertificates('system')
- Merges with bundled Node.js CAs and applies via tls.setDefaultCACertificates()
- Configuration hierarchy: userData/overridden-settings.json (highest) → appPath/overridden-settings.json (lowest)
- Handles both .asar and unpacked app distributions

## Deep Links & Navigation

**Deep Link Handling** (deep_links_protocol_handling.md)
- Parses custom protocol ({electronBuilderJsonInformation.protocol}://) and go URL shortener (https://{packageJsonInformation.goUrlShortener}/)
- Supports four actions: auth (resumeToken), room (validates path), invite, conference
- Resolves server URL and polls getWebContentsByServerUrl() every 100ms until available
- Room path validation: /^\/?(direct|group|channel|livechat)\/[0-9a-zA-Z-_.]+/
- Handles missing servers by prompting user and adding server if permitted

**Navigation Security** (video_call_window_navigation_and_protocol_security.md)
- Allowed protocols: http, https, file, data, about
- Blocked: SMB protocol
- Google shortened URLs (*.g.co) always open externally
- Close page detection (close.html/close2.html) handled gracefully

## Data Flow & State Management

**Server Selection & Badge Updates** (data_flow_server_selection_and_badge_updates.md)
- Server selection: User click → SIDE_BAR_SERVER_SELECTED → currentView reducer → useServers hook reselects → ServerPane updates
- Badge updates: Server webapp calls window.RocketChatDesktop.setBadge() → preload dispatches WEBVIEW_UNREAD_CHANGED → servers reducer → SideBar re-renders
- Add server: AddServerView → SERVER_URL_RESOLUTION_REQUESTED → main.ts resolveServerUrl() → SERVER_URL_RESOLVED → ADD_SERVER_VIEW_SERVER_ADDED → servers reducer appends

**Root Window Icon Management** (root_window_icon_and_server_info_management.md)
- Watches Redux state for badge and favicon changes via selectBadgeAndFavicon
- Renders Badge React component to SVG and composites with favicon via canvas 2D context
- Platform-specific: overlayImage on Windows (32px), full icon on Linux
- Badge aggregation: sums numeric badges, shows bullet point if any badge exists
- Fetches /api/info endpoint for server version validation with Basic auth

## Download Management

**Downloads System** (downloads_system_architecture.md, downloads_system_ipc_handlers_and_s3_expiration.md)
- Downloads tracked via itemId (Date.now())
- State transitions: progressing → paused/completed/cancelled/interrupted/expired
- S3 presigned URL expiry validation: parses X-Amz-Date (YYYYMMDDTHHmmssZ) + X-Amz-Expires (seconds)
- Download preferences persisted via ElectronStore with lastDownloadDirectory tracking
- IPC handlers: pause, resume, cancel, retry, remove, clear-all, show-in-folder, copy-link
- Notifications on completion and expiry; expired downloads notify user and mark cancelled

## Screen Sharing System

**Architecture** (screen_sharing_system_architecture.md)
- FSA request/response pattern with meta.id tracking for one-at-a-time requests
- Provider abstraction: PortalPickerProvider (Linux/Wayland via XDG portal) or InternalPickerProvider (custom React UI)
- Desktop capturer source caching with 3-second stale threshold and thumbnail validation
- macOS screen recording permission checking via systemPreferences.getMediaAccessStatus('screen')

**Request Lifecycle** (screen_sharing_request_lifecycle.md)
- WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED (with meta.id) → ScreenSharingRequestTracker.createRequest() → 60-second timeout → ipcMain.once() listener → source validation → callback invoked with {video: source} or {video: false}
- Only one request allowed at a time (isPending flag); prevents race conditions via requestId

**Desktop Capturer Cache** (desktop_capturer_source_caching.md)
- Background refresh via prewarmDesktopCapturerCache() and refreshDesktopCapturerCache()
- Filters sources with empty name or empty thumbnail
- Cache-first strategy: returns cached sources if not stale (< 3000ms old), triggers refresh if stale
- Source validation cache with 30-second TTL prevents repeated thumbnail validation

**Screen Picker Providers** (screen_picker_provider_abstraction.md)
- PortalPickerProvider: type='portal', used on Linux with Wayland OR desktop env in [GNOME, KDE, XFCE, Cinnamon, MATE, Pantheon, Budgie, Unity]
- InternalPickerProvider: type='internal', requires React UI and cache warming
- detectPickerType() determines provider; singleton pattern via cachedProvider

**IPC Channels** (screen_sharing_ipc_channels.md)
- screen-picker/open: main→renderer one-way notification
- screen-picker/source-responded: renderer→main single response via ipcMain.once()
- screen-picker/screen-recording-is-permission-granted: async handler for permission check
- screen-picker/open-url: renderer requests main to open external URL with protocol validation
- desktop-capturer-get-sources: cache-first strategy with stale detection

## Video Call Window

**Configuration** (video_call_window_configuration_and_webpreferences.md)
- webPreferences: nodeIntegration true, contextIsolation false, webviewTag enabled, v8CacheOptions bypassHeatCheck, spellcheck disabled
- Windows RDP detection via process.env.SESSIONNAME !== Console; disables WebRTC screen capture features (WebRtcAllowWgcDesktopCapturer, WebRtcAllowWgcScreenCapturer)
- Fallback mode supports legacy screen capture via isVideoCallScreenCaptureFallbackEnabled

**Display Media & Screen Sharing** (video_call_window_display_media_and_screen_sharing.md)
- Display media handler with useSystemPicker: false (always custom picker)
- Screen picker provider abstraction; InternalPickerProvider uses createInternalPickerHandler callback
- Error handling catches display media errors and returns {video: false}
- Pending webviews queue handlers until screen picker ready

**HTML Template** (video_call_window_html_template_structure.md)
- HTML5 with CSP policy (script-src self), UTF-8 charset
- DOM: webview-container (absolute fill), loading-overlay-root (three-dot bounce), error-overlay-root (error display), screen-picker-root
- Background color: #2f343d

**IPC Channels** (video_call_window_ipc_channels.md)
- Sync: get-provider-sync (provider name retrieval)
- Async handlers: window lifecycle, media permissions, screen picker, credentials, language, cache prewarming
- 18 async channels for comprehensive window management

**Lifecycle & State** (video_call_window_lifecycle_and_state_management.md)
- Global state: videoCallWindow, isVideoCallWindowDestroying, pendingVideoCallUrl, videoCallCredentials, videoCallProviderName
- Creation: store credentials → wait destruction → close existing → calculate bounds → create window → load HTML → setup webview → set pending URL
- Cleanup: close event → set destroying flag → closed event → clear credentials → cleanupVideoCallWindow removes listeners
- Window bounds fallback: 80% of nearest screen, centered; persistence validates bounds inside some screen
- Lifecycle events dispatch VIDEO_CALL_WINDOW_STATE_CHANGED (debounced 1000ms)
- Destruction polling: DESTRUCTION_CHECK_INTERVAL = 50ms; webview polling: WEBVIEW_CHECK_INTERVAL = 100ms

## Document & Log Viewing

**Document Viewer** (document_viewer_ipc_system.md)
- IPC channels: document-viewer/open-window, document-viewer/fetch-content
- Server-scoped session partitions (persist:serverUrl) for authenticated document fetching
- Protocol validation (http/https only); same-origin constraints on document fetching
- External protocols (non-http/https/file/data/about) routed to openExternal()
- PDF viewer will-navigate handler skips video-call-window.html contexts

**Log Viewer** (log_viewer_window.md)
- Centered BrowserWindow with file selection and custom log file viewing
- Secure file access validation: path traversal prevention, absolute paths only, .log/.txt extensions
- Log tailing with streaming from byte offset for large files
- Export as ZIP archives with compression level 9
- Default log path: app.getPath('logs')/main.log
- Log entry regex: /^\[([^\]]+)\]\s+\[([^\]]+)\]/ for timestamp and level parsing
- Window size: 60% of screen work area (WINDOW_SIZE_MULTIPLIER = 0.6)

## Logging System

**Architecture** (logging_system_architecture.md)
- Multi-process pipeline: console override → context enrichment → privacy redaction → deduplication → file/IPC transport
- IPC rate-limiting: 100 msgs/sec per webContents
- Component context detection via Error().stack inspection with keyword matching
- Privacy redaction: field-based and pattern-based (Bearer tokens, emails, credit cards)
- Redux state detection (3+ signature keys) automatically redacts sensitive state
- File transport: async writes, 10MB rotation; Error JSONL: 5MB limit, 10s flush interval
- Log file permissions: 0600 (owner-only)
- Log format: [processType] [server?] [component?]
- Development level: 'debug'; Production: 'info'

**Privacy Patterns**
- Bearer token: ^Bearer\s+[A-Za-z0-9-._~+/]+=*$
- Email: \b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b
- Credit card: \b(?:\d{4}[\s-]?){3}\d{4}\b (Luhn validated)
- Number normalization: /\b\d{4,}\b/g and /\b\d+\.\d+\b/g for deduplication

## Notifications System

**Architecture** (notifications_system_architecture.md)
- Electron Notification instances managed via three state maps: notifications (Map), notificationTypes (voice|text), notificationCategories (DOWNLOADS|SERVER)
- Icon resolution: data URLs directly; HTTP URLs converted to data URIs via invoke()
- Deduplication by tag; updates existing if tag matches
- Event listeners dispatch: NOTIFICATIONS_NOTIFICATION_SHOWN, NOTIFICATIONS_NOTIFICATION_CLOSED, NOTIFICATIONS_NOTIFICATION_CLICKED, NOTIFICATIONS_NOTIFICATION_REPLIED, NOTIFICATIONS_NOTIFICATION_ACTIONED
- Voice notifications trigger attentionDrawing.drawAttention()

## Internationalization

**Language Detection & Initialization** (i18n_system_language_detection_and_initialization.md)
- I18nService class extends Service base class
- System locale detection via app.getSystemLocale(); parses [languageCode]-[countryCode]
- Language code validation: exactly 2 characters; country code: optional, 2 chars uppercase
- Fallback chain: exact match → language prefix match → fallbackLng
- I18nService exports getLanguage variable and i18nService singleton instance

## Spell Checking

**System** (spell_checking_system.md, spell_checking_system_language_management.md)
- Uses Electron's chromium built-in spell checker (no external library)
- setupSpellChecking() initializes with current languages and registers Redux action listeners
- Language state: Set<string> of active language codes
- Listeners: SPELL_CHECKING_TOGGLED (enable/disable globally), SPELL_CHECKING_LANGUAGE_TOGGLED (add/remove individual languages)
- Language filtering against session.availableSpellCheckerLanguages
- Applied to both defaultSession and all active webContents
- When toggled true: restore previously saved languages; when false: clear all languages

## Sidebar Styling

**Polling System** (sidebar_style_polling_system.md)
- CSS custom property polling every 5 seconds from server webview preload context
- Extracts sidebar background, color, and border via getComputedStyle()
- Version-specific CSS classes: rcx-sidebar--main for 6.3.0+, sidebar for earlier versions
- Supports custom theme via setSidebarCustomTheme
- Dispatches WEBVIEW_SIDEBAR_STYLE_CHANGED to Redux store
- Change detection via computed style comparison to avoid redundant dispatches
- Version comparison extracts numeric parts and compares sequentially (major, minor, patch)

## User Presence & Power Monitoring

**System** (user_presence_system.md)
- Lightweight 4-file architecture: main.ts, preload.ts, common.ts, actions.ts
- Power monitor listeners for suspend and lock-screen events
- IPC channel: power-monitor/get-system-idle-state for polling system idle state
- Redux action types: SYSTEM_SUSPENDING, SYSTEM_LOCKING_SCREEN
- SystemIdleState values: active, idle, locked, unknown
- Auto-away feature with configurable idle threshold; polling every 2 seconds when enabled
- setUserPresenceDetection API with callback attachment/detachment lifecycle
- Dispatches to Rocket.Chat server presence API (Meteor.call UserPresence:away/online)

## Outlook Calendar Integration

**System** (outlook_calendar_integration.md)
- EWS-based calendar sync via ews-javascript-api and @ewsjs/xhr npm packages
- Credential encryption via Electron safeStorage; plaintext fallback for legacy credentials
- Sync coalescing: queues subsequent syncs when one in progress; executes only last queued sync
- Duplicate detection by externalId; keeps first occurrence
- Supports insecure connections for air-gapped environments via allowInsecureOutlookConnections setting
- Default sync interval: 60 minutes; configurable via UI settings or overridden-settings.json
- Minimum Rocket.Chat version: 7.5.0 for endTime/busy fields
- REST API endpoints: GET /api/v1/calendar.events, POST /api/v1/calendar.events/import, POST /api/v1/calendar.events/update, POST /api/v1/calendar.events/delete
- Axios timeout: 10,000ms; initial sync debounce: 100ms

## Preload API Bridge

**Integration** (preload_api_bridge.md)
- Exposes window.RocketChatDesktop object to each server webview
- Integration point between Rocket.Chat webapp and Electron desktop wrapper
- Methods organized by functional area: initialization, notifications, sidebar