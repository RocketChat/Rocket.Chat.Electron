---
children_hash: d77e0716727dec2db8353847133cda5e62bc12f76f4ead8f9382f22d0d522fa2
compression_ratio: 0.1485310119695321
condensation_order: 0
covers: [addserverview_component.md, global_css_stylesheet_and_theme_variables.md, public_assets_structure.md, root_window_html_template_and_initialization.md, serversview_and_serverpane_components.md, shell_root_component_and_layout.md, sidebar_component.md, useservers_hook.md, video_call_window_overlay_stylesheets.md]
covers_token_total: 7352
summary_level: d0
token_count: 1092
type: summary
---
# UI Components Structural Summary

## Overview
The UI components layer provides the visual interface for Rocket.Chat Desktop, organized around three main windows (root, video call, log viewer) with shared theming and component architecture.

## Core Architecture

### Window Structure
- **Root Window** (`root_window_html_template_and_initialization.md`): Main application window (1000x600) with transparent background and macOS vibrancy. Loads `index.html` → `rootWindow.js` bundle. Manages window state persistence, unread badges, and platform-specific close behavior (hide on macOS/Linux, minimize on Windows).
- **Video Call Window** (`video_call_window_overlay_stylesheets.md`): Dedicated window for video calls with loading and error overlays using fixed positioning and flexbox layout.
- **Log Viewer Window**: Separate window for application logs.

### Theming & Styling
- **Global CSS** (`global_css_stylesheet_and_theme_variables.md`): Universal `src/public/main.css` (199 bytes) defines CSS custom properties (--rcx-color-*) for Fuselage design system tokens. Imported by all three HTML templates. Includes imports for Fuselage CSS and GitHub Markdown CSS.
- **Public Assets** (`public_assets_structure.md`): Static assets in `src/public/` include HTML shells, CSS files (main.css, loading.css, error.css), and platform-specific images (tray icons with macOS Template suffix, Linux/Windows numeric badges 1-9, touch bar icons).
- **Shell Component** (`shell_root_component_and_layout.md`): Root renderer (`src/ui/components/Shell/index.tsx`) with theme selection logic (auto/light/dark), flex layout with SideBar + content area, and dynamic CSS loading from app path.

## Navigation & Server Management

### Server List UI
- **SideBar Component** (`sidebar_component.md`): Vertical server navigation in `src/ui/components/SideBar/` with drag-and-drop reordering, keyboard shortcuts (Cmd/Ctrl+1-9), server badges, and context menu. Uses three hooks: useServers, useSorting, useKeyboardShortcuts.
- **useServers Hook** (`useservers_hook.md`): Memoized reselect selector combining currentView and servers Redux state, enriching each server with selected boolean flag via URL href comparison.
- **ServersView & ServerPane** (`serversview_and_serverpane_components.md`): Multi-server webview management using ReparentingContainer to preserve webview state during server switching. Lazy loading (src set only when shouldLoad true). Webview lifecycle: did-attach → dom-ready (300ms) → WEBVIEW_READY dispatch. Partition isolation per server (persist:${serverUrl}). Overlays for document viewer, error handling, and unsupported server states.

### Server Addition
- **AddServerView Component** (`addserverview_component.md`): Form component for adding new servers, conditionally rendered when currentView === "add-new-server". Uses async request/response pattern over Redux for URL validation. Validation states: idle → validating → invalid/ok. Monitors online/offline status with user-facing callout. Auto-focuses input via useAutoFocus hook.

## Key Patterns & Dependencies

### State Management
- Redux selectors for: currentView, servers, isSideBarEnabled, isAddNewServersEnabled, isTransparentWindowEnabled, machineTheme, userThemePreference, appPath, rootWindowState, globalBadgeCount
- Dispatch actions: WEBVIEW_ATTACHED, WEBVIEW_READY, SERVER_URL_RESOLUTION_REQUESTED, ADD_SERVER_VIEW_SERVER_ADDED, SIDE_BAR_* actions

### UI Library
- Fuselage components: TextInput, Button, Callout, FieldGroup, Field, FieldLabel, FieldRow, ButtonGroup, Tile
- Fuselage hooks: useAutoFocus

### Security
- Content-Security-Policy: script-src 'self' on all HTML files
- SMB protocol blocking on root window
- Webview partition isolation per server

### Platform-Specific Behavior
- **macOS**: Transparent background with vibrancy, hidden title bar, Template tray icons, touch bar icons, hide-on-close
- **Windows**: Taskbar badge overlay with unread count, minimize-on-close option
- **Linux**: Numeric badge tray icons, hide-on-close

## Component Hierarchy
```
Shell (theme + layout)
├── SideBar (server list + shortcuts)
│   └── ServerButton (per-server UI)
├── ServersView (webview container)
│   └── ServerPane (per-server webview + overlays)
├── AddServerView (server form)
├── DownloadsManagerView
├── SettingsView
└── Modals (AboutDialog, ServerInfoModal, etc.)
```