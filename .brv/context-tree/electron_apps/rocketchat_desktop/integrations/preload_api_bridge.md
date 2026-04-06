---
title: Preload API Bridge
tags: []
related: [electron_apps/rocketchat_desktop/integrations/outlook_calendar_integration.md, electron_apps/rocketchat_desktop/integrations/screen_sharing_ipc_channels.md, electron_apps/rocketchat_desktop/integrations/document_viewer_ipc_system.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:17:56.088Z'
updatedAt: '2026-04-04T18:17:56.088Z'
---
## Raw Concept
**Task:**
Document the preload API bridge that exposes window.RocketChatDesktop to server webviews

**Files:**
- src/servers/preload/api.ts

**Flow:**
Server webview -> onReady callback -> setServerInfo -> dispatch Redux actions -> sidebar/notifications

**Timestamp:** 2026-04-04

## Narrative
### Structure
The preload API bridge is defined in src/servers/preload/api.ts and exports a RocketChatDesktop object containing all methods available to the Rocket.Chat webapp running in server webviews. Methods are organized by functional area: initialization (onReady, setServerInfo), notifications (createNotification, destroyNotification), sidebar (setBadge, setBackground), theming (setUserThemeAppearance, setSidebarCustomTheme), Outlook calendar integration, internal video chat, document viewer, user presence, and server management.

### Dependencies
Depends on: notification modules (notifications/preload), Outlook calendar modules (outlookCalendar/preload), user presence detection (userPresence/preload), and Redux store for dispatching actions. Each server webview has its own preload context.

### Highlights
Key integration point between Rocket.Chat webapp and Electron desktop wrapper. Enables bidirectional communication: webapp calls desktop methods for system features (notifications, calendar, video chat), while desktop can inject server info and trigger sidebar updates. Supports custom notifications, theme customization, and clipboard operations.

### Rules
Rule 1: onReady callback is invoked when server sets its info
Rule 2: setServerInfo must include version field to update sidebar
Rule 3: Each server webview has isolated preload context
Rule 4: Methods dispatch Redux actions for state management

## Facts
- **preload_api_bridge**: Preload API bridge exposes window.RocketChatDesktop object to each server webview [project]
- **integration_point**: Integration point between Rocket.Chat webapp and Electron wrapper [project]
- **onReady**: onReady(cb) - called when server sets its info [project]
- **setServerInfo**: setServerInfo({version}) - triggers sidebar version display [project]
- **setBadge**: setBadge - updates unread count in sidebar [project]
- **outlook_calendar**: Outlook calendar integration: getOutlookEvents, setOutlookExchangeUrl, hasOutlookCredentials, clearOutlookCredentials, setUserToken [project]
- **user_presence**: User presence detection via setUserPresenceDetection [project]
- **video_chat**: Internal video chat window: getInternalVideoChatWindowEnabled, openInternalVideoChatWindow [project]
- **notifications**: Notification management: createNotification, destroyNotification, dispatchCustomNotification, closeCustomNotification [project]
- **document_viewer**: Document viewer integration via openDocumentViewer [project]
- **theming**: Theme and appearance: setUserThemeAppearance, setSidebarCustomTheme, setBackground [project]
- **server_reload**: Server reload capability via reloadServer [project]
- **clipboard**: Clipboard integration via writeTextToClipboard [project]
- **url_resolution**: URL resolution via setUrlResolver [project]
- **browser_ui**: Favicon and title management via setFavicon and setTitle [project]
- **git_tracking**: Git commit hash tracking via setGitCommitHash [project]
- **user_auth**: User login state management via setUserLoggedIn [project]
