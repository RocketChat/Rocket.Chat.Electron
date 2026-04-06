---
title: Main Process Lifecycle
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:08:03.272Z'
updatedAt: '2026-04-04T18:08:03.272Z'
---
## Raw Concept
**Task:**
Document the Electron main process initialization and lifecycle orchestration in src/main.ts

**Changes:**
- GPU crash handler set up BEFORE app.whenReady() to catch early GPU failures
- Main window marked as stable after showRootWindow() - GPU crashes after this won't trigger fallback
- Feature modules follow feature-folder pattern (e.g. ./screenSharing/main, ./downloads/main)
- No direct BrowserWindow creation in main.ts - delegated to ui/main/rootWindow

**Files:**
- src/main.ts

**Flow:**
setUserDataDirectory -> applySystemCertificates -> setupWebContentsLogging -> performElectronStartup -> setupGpuCrashHandler -> app.whenReady -> createMainReduxStore -> exportLocalStorage -> mergePersistableValues -> setupServers -> i18n.setUp -> i18n.wait -> createRootWindow -> showRootWindow -> markMainWindowStable -> Feature setup -> UI setup

**Timestamp:** 2026-04-04

## Narrative
### Structure
The start() async function in src/main.ts orchestrates the full application lifecycle in strict order across 9 stages: (1) User data and certificates, (2) Logging and GPU setup, (3) App readiness, (4) Redux store creation, (5) Data persistence and servers, (6) Internationalization, (7) Window creation and stability marker, (8) Feature initialization (notifications, screen sharing, video calls, spell checking, deep links, navigation, power monitor, updates, downloads, certificates), (9) UI component setup (dock, menuBar, touchBar, trayIcon).

### Dependencies
Requires: Electron app ready signal, Redux store, localStorage data, i18n initialization. GPU crash handler must run before app.whenReady() to catch early failures.

### Highlights
Strict initialization order is critical. GPU crash handler placement prevents fallback triggering for crashes after window stability. Feature modules use consistent pattern for setup/teardown. before-quit listener ensures clean shutdown: tears down all UI singletons and stops Outlook sync. Error handling catches startup failures and exits with code 1.

### Rules
Rule 1: setUserDataDirectory() and applySystemCertificates() must run before anything else
Rule 2: GPU crash handler must be set up BEFORE app.whenReady() to catch early GPU failures
Rule 3: Main window marked as stable after showRootWindow() - GPU crashes after this won't trigger fallback
Rule 4: Feature modules follow feature-folder pattern (e.g. ./screenSharing/main, ./downloads/main)
Rule 5: No direct BrowserWindow creation in main.ts - delegated to ui/main/rootWindow
Rule 6: on before-quit listener must tear down all UI singletons and stop Outlook sync

### Examples
Feature setup includes: notifications (attentionDrawing), screen sharing (desktop capturer cache), video calls (video call window handler), spell checking, deep links (processDeepLinksInArgs), navigation, power monitor (user presence), updates, downloads (electron-dl with tracking), certificates, and Outlook calendar sync. Each feature has its own module folder with main export for setup.

## Facts
- **entry_point**: Main entry point is src/main.ts with async start() function [project]
- **gpu_crash_handling**: GPU crash handler set up BEFORE app.whenReady() to catch early GPU failures [project]
- **window_stability_marker**: Main window marked as stable after showRootWindow() - GPU crashes after this won't trigger fallback [project]
- **module_organization**: Feature modules follow feature-folder pattern (e.g. ./screenSharing/main, ./downloads/main) [convention]
- **window_creation_delegation**: No direct BrowserWindow creation in main.ts - delegated to ui/main/rootWindow [convention]
- **shutdown_sequence**: before-quit listener tears down all UI singletons and stops Outlook sync [project]
