---
title: Root Window HTML Template and Initialization
tags: []
related: [electron_apps/rocketchat_desktop/ui_components/shell_root_component.md, electron_apps/rocketchat_desktop/integrations/root_window_icon_and_server_info_management.md, structure/redux_store/redux_store_architecture.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:42:40.403Z'
updatedAt: '2026-04-04T18:42:40.403Z'
---
## Raw Concept
**Task:**
Implement and manage the main root BrowserWindow with HTML template, styling, and lifecycle handling

**Changes:**
- Root window uses transparent background with vibrancy effect on macOS
- SMB protocol navigation blocked for security
- Window state persisted and restored via Redux store
- Dynamic badge overlay on Windows taskbar icon
- Platform-specific close behavior (hide vs minimize vs quit)

**Files:**
- src/public/index.html
- src/ui/main/rootWindow.ts
- src/public/main.css

**Flow:**
createRootWindow -> showRootWindow -> loadFile(app/index.html) -> setupRootWindow -> listen to window events -> applyRootWindowState

**Timestamp:** 2026-04-04

**Patterns:**
- `^script-src 'self'$` - Content Security Policy restricts scripts to self-hosted only
- `^smb://` (flags: i) - Blocks navigation and window open attempts to SMB protocol

## Narrative
### Structure
Root window is created in src/ui/main/rootWindow.ts and loads src/public/index.html as the entry point. The HTML template mounts a #root div and loads the compiled rootWindow.js bundle. CSS is loaded from main.css for theming. After build, all assets are placed in the app/ directory. The window is configured with platform-specific settings (title bar style, vibrancy on macOS, transparent background).

### Dependencies
Depends on Electron BrowserWindow API, Redux store for state management, i18next for internationalization, reselect for selectors, nativeTheme for system theme detection. Requires app/ directory after build with compiled bundles.

### Highlights
Dynamic window state management with Redux, automatic restoration of window bounds/maximized/minimized/fullscreen states, unread message badge display with platform-specific behavior, machine theme detection and application, dynamic taskbar icon with badge overlay (Windows), context menu with standard edit operations, SMB protocol blocking for security, vibrancy effect on macOS for modern UI.

### Rules
Rule 1: Window state is persisted and restored from Redux store
Rule 2: SMB protocol navigation is blocked for security
Rule 3: Close event is prevented by default - window hides on macOS/Linux or minimizes on Windows
Rule 4: Window operations use safeWindowOperation wrapper to handle destroyed windows
Rule 5: All window listeners are cleaned up on app quit
Rule 6: Context menu is shown on right-click with platform-appropriate accelerators

### Examples
Example 1: Window initialization - createRootWindow() creates 1000x600 window with dark background (#2f343d) or transparent (#00000000) on macOS with vibrancy. Example 2: State restoration - applyRootWindowState() restores saved bounds and window state (maximized/minimized/fullscreen). Example 3: Badge display - When unread count > 0 and window not focused, show window if isShowWindowOnUnreadChangedEnabled is true, or flash frame on non-macOS platforms. Example 4: Close handling - On macOS/Linux: hide window and prevent close. On Windows: minimize or quit based on isMinimizeOnCloseEnabled. Example 5: Icon update - Windows taskbar icon includes overlay badge showing unread count with i18n description.

### Diagrams
**Root Window Lifecycle**
```
createRootWindow()
    ↓
setupRootWindow()
    ├→ watch(globalBadgeCount) → show/flash on unread
    ├→ watch(currentView) → update window title
    ├→ listen(WEBVIEW_FOCUS_REQUESTED) → focus/show
    ├→ watch(rootWindowIcon) → update icon with badge
    ├→ watch(isMenuBarEnabled) → toggle menu bar
    └→ listen to window events → debounce → fetchAndDispatchWindowState
        (show, hide, focus, blur, maximize, minimize, resize, move)
    ↓
showRootWindow()
    ├→ Setup context menu listener
    ├→ loadFile(app/index.html)
    ├→ setupRootWindowReload (dev only)
    └→ Wait for ready-to-show → applyRootWindowState
        ↓
    Window visible to user
```

## Facts
- **root_window_template**: src/public/index.html is the HTML template for the main root BrowserWindow [project]
- **root_div_mount**: index.html mounts a #root div for React rendering [project]
- **bundle_loading**: index.html loads rootWindow.js (compiled Rollup bundle from src/rootWindow.ts) [project]
- **css_loading**: Only CSS loaded is main.css for CSS variables/theming [project]
- **csp_policy**: Content Security Policy: script-src 'self' [project]
- **file_load_path**: Loaded via browserWindow.loadFile(path.join(app.getAppPath(), 'app/index.html')) in src/ui/main/rootWindow.ts line 590 [project]
- **asset_directory**: After build, assets land in app/ directory [project]
- **window_dimensions**: Root window has initial dimensions: 1000x600 with minWidth 400, minHeight 400 [project]
- **title_bar_style**: Platform-specific title bar: 'hidden' on macOS, 'default' on others [convention]
- **background_color**: Root window background color: #00000000 (transparent) if vibrancy enabled, #2f343d otherwise [project]
- **smb_protocol_blocking**: SMB protocol navigation is blocked for security [project]
- **window_state_redux**: Window state is managed via Redux store (rootWindowState selector) [project]
- **window_event_handling**: Window events (show, hide, focus, blur, maximize, minimize, resize, move) trigger state updates via debounced fetchAndDispatchWindowState [project]
- **unread_badge_display**: Unread message badge display is configurable via isShowWindowOnUnreadChangedEnabled and isFlashFrameEnabled [project]
- **window_title_management**: Window title is derived from current server's pageTitle or title, falling back to app.name [project]
- **close_behavior**: Close behavior varies by platform: macOS/Linux hide to tray, Windows minimizes or quits based on isMinimizeOnCloseEnabled [convention]
- **window_icon_with_badge**: Root window icon is updated dynamically with badge overlay (Windows-specific feature) [project]
- **machine_theme_detection**: Machine theme (dark/light) is monitored via nativeTheme and dispatched to Redux store [project]
- **context_menu**: Context menu on root window includes undo, redo, cut, copy, paste, selectAll with platform-specific accelerators [project]
- **localstorage_export**: localStorage is exported via temporary window before clearing (used in exportLocalStorage function) [project]
