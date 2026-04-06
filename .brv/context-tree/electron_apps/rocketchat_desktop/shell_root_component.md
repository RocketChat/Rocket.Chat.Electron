---
title: Shell Root Component
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:08:48.892Z'
updatedAt: '2026-04-04T18:08:48.892Z'
---
## Raw Concept
**Task:**
Document Shell root React component that composes the entire Rocket.Chat desktop UI

**Changes:**
- Documented Shell component structure and composition
- Identified Redux state selectors and theme resolution logic
- Documented platform-specific rendering (macOS guards)
- Documented modal dialog composition

**Files:**
- src/ui/components/Shell/index.tsx

**Flow:**
Redux state (appPath, machineTheme, userThemePreference, isTransparentWindowEnabled) -> Shell component -> renders layout with TopBar, SideBar, main content area, and modal dialogs

## Narrative
### Structure
Shell is the root component located at src/ui/components/Shell/index.tsx. It uses a flexbox column layout at the top level with a row layout for the main content area. The layout consists of: (1) TopBar (macOS only), (2) Main row with SideBar on the left and content area on the right. The content area contains ServersView, AddServerView, DownloadsManagerView, and SettingsView. Modal dialogs are rendered at the end: AboutDialog, ServerInfoModal, SupportedVersionDialog, ScreenSharingDialog, RootScreenSharePicker, SelectClientCertificateDialog, UpdateDialog, ClearCacheDialog, OutlookCredentialsDialog.

### Dependencies
Depends on: Redux store (RootState), @rocket.chat/fuselage (Box, PaletteStyleTag), React hooks (useEffect, useLayoutEffect, useState, useSelector), and child components (TopBar, SideBar, ServersView, AddServerView, DownloadsManagerView, SettingsView, AboutDialog, ServerInfoModal, SupportedVersionDialog, ScreenSharingDialog, RootScreenSharePicker, SelectClientCertificateDialog, UpdateDialog, ClearCacheDialog, OutlookCredentialsDialog). Loads rocketchat.css stylesheet dynamically via appPath.

### Highlights
Key features: (1) Theme resolution with auto-detection from machineTheme or userThemePreference override, (2) PaletteStyleTag applies theme to :root selector, (3) Platform guards ensure TopBar and WindowDragBar only render on macOS (darwin), (4) GlobalStyles component applies transparent window styling when enabled, (5) Dynamic stylesheet loading for icons via appPath, (6) Tooltip provider wraps entire component tree

### Rules
Rule 1: TopBar and WindowDragBar only render when process.platform === "darwin"
Rule 2: Theme resolution: if userThemePreference is "auto", use machineTheme; otherwise use userThemePreference
Rule 3: appPath is required to load rocketchat.css stylesheet
Rule 4: isTransparentWindowEnabled controls GlobalStyles transparency prop
