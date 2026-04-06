---
title: ServersView and ServerPane Components
tags: []
related: [electron_apps/rocketchat_desktop/shell_root_component.md, electron_apps/rocketchat_desktop/main_process_lifecycle.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:10:01.485Z'
updatedAt: '2026-04-04T18:10:01.485Z'
---
## Raw Concept
**Task:**
Document the ServersView and ServerPane components for multi-server webview management

**Files:**
- src/ui/components/ServersView/index.tsx
- src/ui/components/ServersView/ServerPane.tsx
- src/ui/components/ServersView/DocumentViewer.tsx
- src/ui/components/ServersView/ErrorView.tsx
- src/ui/components/ServersView/UnsupportedServer.tsx

**Flow:**
ServersView renders ReparentingContainer -> ServerPane for each server -> webview lifecycle (did-attach -> dom-ready -> WEBVIEW_READY) -> content rendering with overlays

**Timestamp:** 2026-04-04

**Patterns:**
- `shouldLoad\s*=\s*isSelected\s*\|\|\s*userLoggedIn\s*!==\s*false` - Lazy loading condition: webview loads when selected OR user is logged in
- `partition=\`persist:\${serverUrl}\`` - Electron webview partition pattern using server URL for session isolation

## Narrative
### Structure
ServersView manages multiple server instances using ReparentingContainer to keep webviews alive in DOM. Each ServerPane renders a StyledWebview element with DocumentViewer, UnsupportedServer, and ErrorView overlays. ReparentingContainer prevents webview reload when switching servers.

### Dependencies
Depends on: useServers hook, ReparentingContainer utility, Redux dispatch (WEBVIEW_ATTACHED, WEBVIEW_READY, LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, SERVER_DOCUMENT_VIEWER_OPEN_URL actions), Electron ipcRenderer for online event handling

### Highlights
Lazy loading: webview.src only set when shouldLoad is true. Webview lifecycle: did-attach -> dom-ready with 300ms timeout before WEBVIEW_READY dispatch. Focus management: refocuses webview on window focus and server selection. Document viewer overlay for PDF/Markdown. Error handling with reload capability. Online event monitoring for version refresh.

### Rules
Rule 1: Webview src attribute only set when shouldLoad is true (lazy load)
Rule 2: WEBVIEW_ATTACHED dispatched on did-attach event
Rule 3: WEBVIEW_READY dispatched 300ms after dom-ready event
Rule 4: Document viewer activates when isSelected AND documentViewerOpenUrl is non-empty
Rule 5: Webview partition uses persist:${serverUrl} for session isolation per server
Rule 6: Window focus handler only refocuses webview if !isSelected OR !isFailed
Rule 7: Online event triggers refresh-supported-versions IPC invoke

### Examples
ServerPane props: {serverUrl: "https://rocket.chat", lastPath: "/channel/general", isSelected: true, isFailed: false, isSupported: true, supportedVersionsFetchState: "success", documentViewerOpenUrl: "", documentViewerFormat: "", userLoggedIn: true}

Webview lifecycle dispatch:
- did-attach event -> WEBVIEW_ATTACHED action with url and webContentsId
- dom-ready event -> WEBVIEW_READY action with url and webContentsId (300ms delay)

Document viewer activation:
- Activates when: isSelected && documentViewerOpenUrl !== ""
- Closes by dispatching SERVER_DOCUMENT_VIEWER_OPEN_URL with empty documentUrl
