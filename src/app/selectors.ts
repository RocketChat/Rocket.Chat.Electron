import { createStructuredSelector } from 'reselect';

import type { RootState } from '../store/rootReducer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const selectPersistableValues = createStructuredSelector<any>({
  currentView: ({ currentView }: RootState) => currentView,
  doCheckForUpdatesOnStartup: ({ doCheckForUpdatesOnStartup }: RootState) =>
    doCheckForUpdatesOnStartup,
  downloads: ({ downloads }: RootState) => downloads,
  machineTheme: ({ machineTheme }: RootState) => machineTheme,
  isMenuBarEnabled: ({ isMenuBarEnabled }: RootState) => isMenuBarEnabled,
  isShowWindowOnUnreadChangedEnabled: ({
    isShowWindowOnUnreadChangedEnabled,
  }: RootState) => isShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled: ({ isSideBarEnabled }: RootState) => isSideBarEnabled,
  isTrayIconEnabled: ({ isTrayIconEnabled }: RootState) => isTrayIconEnabled,
  rootWindowState: ({ rootWindowState }: RootState) => rootWindowState,
  servers: ({ servers }: RootState) => servers,
  skippedUpdateVersion: ({ skippedUpdateVersion }: RootState) =>
    skippedUpdateVersion,
  trustedCertificates: ({ trustedCertificates }: RootState) =>
    trustedCertificates,
  notTrustedCertificates: ({ notTrustedCertificates }: RootState) =>
    notTrustedCertificates,
  isEachUpdatesSettingConfigurable: ({
    isEachUpdatesSettingConfigurable,
  }: RootState) => isEachUpdatesSettingConfigurable,
  isUpdatingEnabled: ({ isUpdatingEnabled }: RootState) => isUpdatingEnabled,
  isHardwareAccelerationEnabled: ({
    isHardwareAccelerationEnabled,
  }: RootState) => isHardwareAccelerationEnabled,
  externalProtocols: ({ externalProtocols }: RootState) => externalProtocols,
  allowedJitsiServers: ({ allowedJitsiServers }: RootState) =>
    allowedJitsiServers,
  isReportEnabled: ({ isReportEnabled }: RootState) => isReportEnabled,
  isFlashFrameEnabled: ({ isFlashFrameEnabled }: RootState) =>
    isFlashFrameEnabled,
  isInternalVideoChatWindowEnabled: ({
    isInternalVideoChatWindowEnabled,
  }: RootState) => isInternalVideoChatWindowEnabled,
  isMinimizeOnCloseEnabled: ({ isMinimizeOnCloseEnabled }: RootState) =>
    isMinimizeOnCloseEnabled,
  isAddNewServersEnabled: ({ isAddNewServersEnabled }: RootState) =>
    isAddNewServersEnabled,
  isDeveloperModeEnabled: ({ isDeveloperModeEnabled }: RootState) =>
    isDeveloperModeEnabled,
  hasHideOnTrayNotificationShown: ({
    hasHideOnTrayNotificationShown,
  }: RootState) => hasHideOnTrayNotificationShown,
  lastSelectedServerUrl: ({ lastSelectedServerUrl }: RootState) =>
    lastSelectedServerUrl,
  allowedNTLMCredentialsDomains: ({
    allowedNTLMCredentialsDomains,
  }: RootState) => allowedNTLMCredentialsDomains,
  isNTLMCredentialsEnabled: ({ isNTLMCredentialsEnabled }: RootState) =>
    isNTLMCredentialsEnabled,
  mainWindowTitle: ({ mainWindowTitle }: RootState) =>
    mainWindowTitle || 'Rocket.Chat',
  selectedBrowser: ({ selectedBrowser }: RootState) => selectedBrowser,
  videoCallWindowState: ({ videoCallWindowState }: RootState) =>
    videoCallWindowState,
  isVideoCallWindowPersistenceEnabled: ({
    isVideoCallWindowPersistenceEnabled,
  }: RootState) => isVideoCallWindowPersistenceEnabled,
  isVideoCallDevtoolsAutoOpenEnabled: ({
    isVideoCallDevtoolsAutoOpenEnabled,
  }: RootState) => isVideoCallDevtoolsAutoOpenEnabled,
  isTransparentWindowEnabled: ({ isTransparentWindowEnabled }: RootState) =>
    isTransparentWindowEnabled,
  isVideoCallScreenCaptureFallbackEnabled: ({
    isVideoCallScreenCaptureFallbackEnabled,
  }: RootState) => isVideoCallScreenCaptureFallbackEnabled,
  updateChannel: ({ updateChannel }: RootState) => updateChannel,
  userThemePreference: ({ userThemePreference }: RootState) =>
    userThemePreference,
  isVerboseOutlookLoggingEnabled: ({
    isVerboseOutlookLoggingEnabled,
  }: RootState) => isVerboseOutlookLoggingEnabled,
  isVerboseMainLoggingEnabled: ({ isVerboseMainLoggingEnabled }: RootState) =>
    isVerboseMainLoggingEnabled,
  isVerboseAppLoggingEnabled: ({ isVerboseAppLoggingEnabled }: RootState) =>
    isVerboseAppLoggingEnabled,
  isVerboseAuthLoggingEnabled: ({ isVerboseAuthLoggingEnabled }: RootState) =>
    isVerboseAuthLoggingEnabled,
  isVerboseIpcLoggingEnabled: ({ isVerboseIpcLoggingEnabled }: RootState) =>
    isVerboseIpcLoggingEnabled,
  isVerboseUiLoggingEnabled: ({ isVerboseUiLoggingEnabled }: RootState) =>
    isVerboseUiLoggingEnabled,
  isVerboseUpdatesLoggingEnabled: ({
    isVerboseUpdatesLoggingEnabled,
  }: RootState) => isVerboseUpdatesLoggingEnabled,
  isVerboseNotificationsLoggingEnabled: ({
    isVerboseNotificationsLoggingEnabled,
  }: RootState) => isVerboseNotificationsLoggingEnabled,
  isVerboseVideoCallLoggingEnabled: ({
    isVerboseVideoCallLoggingEnabled,
  }: RootState) => isVerboseVideoCallLoggingEnabled,
  isVerboseServersLoggingEnabled: ({
    isVerboseServersLoggingEnabled,
  }: RootState) => isVerboseServersLoggingEnabled,
  isVerboseLogViewerLoggingEnabled: ({
    isVerboseLogViewerLoggingEnabled,
  }: RootState) => isVerboseLogViewerLoggingEnabled,
});
