---
title: Shell Root Component and Layout
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:31:19.349Z'
updatedAt: '2026-04-04T18:31:19.349Z'
---
## Raw Concept
**Task:**
Render Shell root component with theme support, layout composition, and dynamic CSS loading

**Changes:**
- Added Shell component with Redux theme selectors
- Added theme logic (auto/light/dark preference)
- Added layout composition (SideBar + content area)
- Added dynamic CSS loading from app path

**Files:**
- src/ui/components/Shell/index.tsx

**Flow:**
Redux selectors (appPath, machineTheme, userThemePreference) → compute effective theme → render layout → load CSS

**Timestamp:** 2026-04-04

## Narrative
### Structure
Shell component (src/ui/components/Shell/index.tsx) is the root renderer component. It selects Redux state for appPath, machineTheme, userThemePreference, and isTransparentWindowEnabled. Layout is flex column with SideBar (left) and content area (right). macOS includes WindowDragBar and TopBar.

### Dependencies
Requires Redux selectors for app configuration. Dynamically loads {appPath}/app/icons/rocketchat.css on mount. Cleans up link element on unmount.

### Highlights
Content area renders: ServersView, AddServerView, DownloadsManagerView, SettingsView. Modals: AboutDialog, ServerInfoModal, SupportedVersionDialog, ScreenSharingDialog, RootScreenSharePicker, SelectClientCertificateDialog, UpdateDialog, ClearCacheDialog, OutlookCredentialsDialog.

### Rules
Rule 1: If userThemePreference === "auto", use machineTheme
Rule 2: Otherwise use userThemePreference
Rule 3: Dynamic CSS path: {appPath}/app/icons/rocketchat.css
Rule 4: Clean up CSS link element on unmount
