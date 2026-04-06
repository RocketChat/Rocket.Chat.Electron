---
title: Public Assets Structure
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:16:55.353Z'
updatedAt: '2026-04-04T18:16:55.353Z'
---
## Raw Concept
**Task:**
Document public assets structure for Rocket.Chat Electron app

**Files:**
- src/public/index.html
- src/public/video-call-window.html
- src/public/log-viewer-window.html
- src/public/main.css
- src/public/loading.css
- src/public/error.css
- src/public/images/file-icon.svg
- src/public/images/icon.ico
- src/public/images/tray/darwin/
- src/public/images/tray/linux/
- src/public/images/tray/win32/
- src/public/images/touch-bar/

**Flow:**
Static HTML shells -> Electron BrowserWindows -> CSS styling -> Asset bundling

**Timestamp:** 2026-04-04

## Narrative
### Structure
Public assets are organized in src/public/ containing HTML shells for three main windows (root, video-call, log-viewer), global CSS files (main.css, loading.css, error.css), and platform-specific image assets (tray icons, touch bar icons, app icon). Each HTML file loads a corresponding JavaScript entry point (rootWindow.js, video-call-window.js, log-viewer-window.js).

### Highlights
All HTML files enforce Content-Security-Policy with script-src restricted to self. Tray icons are organized by platform with platform-specific naming conventions. macOS uses adaptive template images with Template suffix. Linux and Windows use numeric badge counts (1-9) plus dot/plus-9 for overflow indicators. Touch Bar icons provide message formatting buttons for macOS.

### Rules
Rule 1: All HTML files must include Content-Security-Policy meta tag restricting script-src to self
Rule 2: macOS tray icons use Template suffix for adaptive rendering
Rule 3: Linux/Windows tray icons use numeric badge counts 1-9 for notification counts
Rule 4: Each window HTML file loads exactly one corresponding JavaScript entry point
Rule 5: CSS files are shared across windows via relative href links

### Examples
Example: index.html loads rootWindow.js and main.css. Content-Security-Policy: script-src 'self' prevents inline scripts. Video call window uses webview element positioned absolutely with 100% width/height. Log viewer window uses flexbox layout for #root with 100vh height.

## Facts
- **root_window_shell**: index.html is the main root window shell loaded by rootWindow BrowserWindow [project]
- **video_call_window**: video-call-window.html is the video call window shell loaded by videoCallWindow [project]
- **log_viewer_window**: log-viewer-window.html is the log viewer window shell loaded by logViewerWindow [project]
- **content_security_policy**: All HTML files enforce Content-Security-Policy with script-src restricted to self [project]
- **macos_tray_icons**: macOS tray icons use Template suffix and are auto-inverted by macOS for dark/light menu bar [convention]
- **linux_windows_tray_icons**: Linux and Windows tray icons use numeric badge counts 1-9 for notification counts [convention]
- **touch_bar_icons**: Touch Bar icons are macOS-specific for message formatting (bold, italic, inline_code, multi_line, strike) [project]
- **video_window_element**: Video call window uses webview element for embedded content [project]
