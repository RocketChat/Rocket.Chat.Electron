import { combineReducers } from 'redux';

import { allowedNTLMCredentialsDomains } from '../app/reducers/allowedNTLMCredentialsDomains';
import { appPath } from '../app/reducers/appPath';
import { appVersion } from '../app/reducers/appVersion';
import { machineTheme } from '../app/reducers/machineTheme';
import { mainWindowTitle } from '../app/reducers/mainWindowTitle';
import { screenCaptureFallbackForced } from '../app/reducers/screenCaptureFallbackForced';
import { downloads } from '../downloads/reducers/downloads';
import { allowedJitsiServers } from '../jitsi/reducers';
import {
  clientCertificates,
  externalProtocols,
  trustedCertificates,
  notTrustedCertificates,
} from '../navigation/reducers';
import { isNotificationQuickReplyEnabled } from '../notifications/reducers/isNotificationQuickReplyEnabled';
import { allowInsecureOutlookConnections } from '../outlookCalendar/reducers/allowInsecureOutlookConnections';
import { outlookCalendarSyncInterval } from '../outlookCalendar/reducers/outlookCalendarSyncInterval';
import { outlookCalendarSyncIntervalOverride } from '../outlookCalendar/reducers/outlookCalendarSyncIntervalOverride';
import { servers } from '../servers/reducers';
import {
  telephonyGlobalShortcutConfig,
  telephonyGlobalShortcutRegistrationStatus,
  telephonyPreferredServer,
} from '../telephony/reducers';
import { availableBrowsers } from '../ui/reducers/availableBrowsers';
import { currentView } from '../ui/reducers/currentView';
import { dialogs } from '../ui/reducers/dialogs';
import { e2ePdfPreviewSizeLimit } from '../ui/reducers/e2ePdfPreviewSizeLimit';
import { hasHideOnTrayNotificationShown } from '../ui/reducers/hasHideOnTrayNotificationShown';
import { isAddNewServersEnabled } from '../ui/reducers/isAddNewServersEnabled';
import { isDebugLoggingEnabled } from '../ui/reducers/isDebugLoggingEnabled';
import { isDetailedEventsLoggingEnabled } from '../ui/reducers/isDetailedEventsLoggingEnabled';
import { isDeveloperModeEnabled } from '../ui/reducers/isDeveloperModeEnabled';
import { isDownloadsPercentageEnabled } from '../ui/reducers/isDownloadsPercentageEnabled';
import { isDownloadsWindowOpen } from '../ui/reducers/isDownloadsWindowOpen';
import { isFlashFrameEnabled } from '../ui/reducers/isFlashFrameEnabled';
import { isHardwareAccelerationEnabled } from '../ui/reducers/isHardwareAccelerationEnabled';
import { isInternalVideoChatWindowEnabled } from '../ui/reducers/isInternalVideoChatWindowEnabled';
import { isLogViewerWindowOpen } from '../ui/reducers/isLogViewerWindowOpen';
import { isMenuBarEnabled } from '../ui/reducers/isMenuBarEnabled';
import { isMessageBoxFocused } from '../ui/reducers/isMessageBoxFocused';
import { isMinimizeOnCloseEnabled } from '../ui/reducers/isMinimizeOnCloseEnabled';
import { isNTLMCredentialsEnabled } from '../ui/reducers/isNTLMCredentialsEnabled';
import { isPresenceDisconnectionSimulated } from '../ui/reducers/isPresenceDisconnectionSimulated';
import { isReportEnabled } from '../ui/reducers/isReportEnabled';
import { isSettingsWindowOpen } from '../ui/reducers/isSettingsWindowOpen';
import { isShowWindowOnUnreadChangedEnabled } from '../ui/reducers/isShowWindowOnUnreadChangedEnabled';
import { isSideBarEnabled } from '../ui/reducers/isSideBarEnabled';
import { isTelephonyEnabled } from '../ui/reducers/isTelephonyEnabled';
import { isTransparentWindowEnabled } from '../ui/reducers/isTransparentWindowEnabled';
import { isTrayIconEnabled } from '../ui/reducers/isTrayIconEnabled';
import { isVerboseOutlookLoggingEnabled } from '../ui/reducers/isVerboseOutlookLoggingEnabled';
import { isVideoCallDevtoolsAutoOpenEnabled } from '../ui/reducers/isVideoCallDevtoolsAutoOpenEnabled';
import { isVideoCallScreenCaptureFallbackEnabled } from '../ui/reducers/isVideoCallScreenCaptureFallbackEnabled';
import { isVideoCallWindowPersistenceEnabled } from '../ui/reducers/isVideoCallWindowPersistenceEnabled';
import { lastSelectedServerUrl } from '../ui/reducers/lastSelectedServerUrl';
import { navigationLayout } from '../ui/reducers/navigationLayout';
import { openDialog } from '../ui/reducers/openDialog';
import { rootWindowIcon } from '../ui/reducers/rootWindowIcon';
import { rootWindowState } from '../ui/reducers/rootWindowState';
import { secondaryWindowStates } from '../ui/reducers/secondaryWindowStates';
import { selectedBrowser } from '../ui/reducers/selectedBrowser';
import { userThemePreference } from '../ui/reducers/userThemePreference';
import { videoCallWindowState } from '../ui/reducers/videoCallWindowState';
import {
  doCheckForUpdatesOnStartup,
  isCheckingForUpdates,
  isEachUpdatesSettingConfigurable,
  isUpdatePanelOpen,
  isUpdatingAllowed,
  isUpdatingEnabled,
  newUpdateVersion,
  skippedUpdateVersion,
  updateCheckStatus,
  updateDownloadProgress,
  updateDownloadStatus,
  updateError,
  updateChannel,
  updateStore,
} from '../updates/reducers';

export const rootReducer = combineReducers({
  allowedJitsiServers,
  allowInsecureOutlookConnections,
  outlookCalendarSyncInterval,
  outlookCalendarSyncIntervalOverride,
  appPath,
  appVersion,
  availableBrowsers,
  clientCertificates,
  currentView,
  dialogs,
  doCheckForUpdatesOnStartup,
  downloads,
  externalProtocols,
  isCheckingForUpdates,
  isEachUpdatesSettingConfigurable,
  isMenuBarEnabled,
  isMessageBoxFocused,
  isShowWindowOnUnreadChangedEnabled,
  isSettingsWindowOpen,
  isSideBarEnabled,
  navigationLayout,
  isTrayIconEnabled,
  isMinimizeOnCloseEnabled,
  isUpdatePanelOpen,
  isUpdatingAllowed,
  isUpdatingEnabled,
  mainWindowTitle,
  machineTheme,
  newUpdateVersion,
  openDialog,
  rootWindowIcon,
  rootWindowState,
  secondaryWindowStates,
  selectedBrowser,
  servers,
  userThemePreference,
  skippedUpdateVersion,
  trustedCertificates,
  notTrustedCertificates,
  updateCheckStatus,
  updateDownloadProgress,
  updateDownloadStatus,
  updateError,
  isReportEnabled,
  isFlashFrameEnabled,
  isDownloadsPercentageEnabled,
  isHardwareAccelerationEnabled,
  isInternalVideoChatWindowEnabled,
  isAddNewServersEnabled,
  hasHideOnTrayNotificationShown,
  lastSelectedServerUrl,
  allowedNTLMCredentialsDomains,
  isNTLMCredentialsEnabled,
  videoCallWindowState,
  isVideoCallWindowPersistenceEnabled,
  isDeveloperModeEnabled,
  isDebugLoggingEnabled,
  e2ePdfPreviewSizeLimit,
  isDetailedEventsLoggingEnabled,
  isVerboseOutlookLoggingEnabled,
  updateChannel,
  updateStore,
  screenCaptureFallbackForced,
  isVideoCallDevtoolsAutoOpenEnabled,
  isPresenceDisconnectionSimulated,
  isDownloadsWindowOpen,
  isLogViewerWindowOpen,
  isTransparentWindowEnabled,
  isVideoCallScreenCaptureFallbackEnabled,
  telephonyPreferredServer,
  telephonyGlobalShortcutConfig,
  telephonyGlobalShortcutRegistrationStatus,
  isTelephonyEnabled,
  isNotificationQuickReplyEnabled,
});

export type RootState = ReturnType<typeof rootReducer>;
