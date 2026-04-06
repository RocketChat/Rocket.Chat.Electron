---
title: Reducer Slices Organization
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:25:19.829Z'
updatedAt: '2026-04-04T18:25:19.829Z'
---
## Raw Concept
**Task:**
Document the organization of Redux reducer slices by functional domain

**Changes:**
- App core: appPath, appVersion, machineTheme, mainWindowTitle, screenCaptureFallbackForced, allowedNTLMCredentialsDomains
- Server management: servers, lastSelectedServerUrl
- Navigation/Security: clientCertificates, externalProtocols, trustedCertificates, notTrustedCertificates
- Downloads: downloads
- Updates: isCheckingForUpdates, isUpdatingAllowed, isUpdatingEnabled, isEachUpdatesSettingConfigurable, doCheckForUpdatesOnStartup, newUpdateVersion, skippedUpdateVersion, updateError, updateChannel
- UI flags: isMenuBarEnabled, isSideBarEnabled, isTrayIconEnabled, isMinimizeOnCloseEnabled, isFlashFrameEnabled, isHardwareAccelerationEnabled, isTransparentWindowEnabled, isAddNewServersEnabled, hasHideOnTrayNotificationShown, isShowWindowOnUnreadChangedEnabled
- Window state: rootWindowState, rootWindowIcon, currentView, dialogs, openDialog
- Video calls: videoCallWindowState, isVideoCallWindowPersistenceEnabled, isInternalVideoChatWindowEnabled, isVideoCallScreenCaptureFallbackEnabled, isVideoCallDevtoolsAutoOpenEnabled
- Outlook integration: allowInsecureOutlookConnections, outlookCalendarSyncInterval, outlookCalendarSyncIntervalOverride
- Other: allowedJitsiServers, availableBrowsers, selectedBrowser, userThemePreference, isMessageBoxFocused, isNTLMCredentialsEnabled, isReportEnabled, isDeveloperModeEnabled, isDebugLoggingEnabled, isDetailedEventsLoggingEnabled, isVerboseOutlookLoggingEnabled

**Flow:**
Domain-specific reducers -> imported to rootReducer.ts -> combined via combineReducers() -> exported as RootState type

## Narrative
### Structure
Reducer slices are organized into 10 functional domains: (1) App core settings handle application-level state like paths, versions, themes, and window titles. (2) Server management tracks active servers and selected server URLs. (3) Navigation/Security manages client certificates and protocol handling. (4) Downloads tracks download state. (5) Updates handles version checking and update configuration. (6) UI flags control visibility and behavior of UI elements (menu bar, sidebar, tray, hardware acceleration, etc.). (7) Window state manages window dimensions, icons, and dialog visibility. (8) Video calls tracks video call window state and feature flags. (9) Outlook integration manages calendar sync settings. (10) Other miscellaneous features like Jitsi servers, browser selection, and developer mode.

### Dependencies
Reducer imports come from: ../app/reducers/, ../downloads/reducers/, ../jitsi/reducers, ../navigation/reducers, ../servers/reducers, ../ui/reducers/, ../updates/reducers, ../outlookCalendar/reducers/

### Highlights
Total of ~50 reducer slices combined into single RootState. Each reducer imported from its domain-specific module path (e.g., ../app/reducers, ../ui/reducers, ../updates/reducers). Reducers are grouped logically by feature/domain rather than alphabetically, improving code organization and maintainability.
