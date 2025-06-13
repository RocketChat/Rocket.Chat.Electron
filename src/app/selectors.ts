import { createStructuredSelector } from 'reselect';

import type { RootState } from '../store/rootReducer';

export const selectPersistableValues = createStructuredSelector({
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
  updateChannel: ({ updateChannel }: RootState) => updateChannel,
});
