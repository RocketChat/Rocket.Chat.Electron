import { createStructuredSelector } from 'reselect';

import type { PersistableValues } from './PersistableValues';
import type { RootState } from '../store/rootReducer';

export const selectPersistableValues = createStructuredSelector<
  RootState,
  PersistableValues
>({
  currentView: ({ currentView }) => currentView,
  doCheckForUpdatesOnStartup: ({ doCheckForUpdatesOnStartup }) =>
    doCheckForUpdatesOnStartup,
  downloads: ({ downloads }) => downloads,
  isMenuBarEnabled: ({ isMenuBarEnabled }) => isMenuBarEnabled,
  isShowWindowOnUnreadChangedEnabled: ({
    isShowWindowOnUnreadChangedEnabled,
  }) => isShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled: ({ isSideBarEnabled }) => isSideBarEnabled,
  isTrayIconEnabled: ({ isTrayIconEnabled }) => isTrayIconEnabled,
  rootWindowState: ({ rootWindowState }) => rootWindowState,
  servers: ({ servers }) => servers,
  skippedUpdateVersion: ({ skippedUpdateVersion }) => skippedUpdateVersion,
  trustedCertificates: ({ trustedCertificates }) => trustedCertificates,
  notTrustedCertificates: ({ notTrustedCertificates }) =>
    notTrustedCertificates,
  isEachUpdatesSettingConfigurable: ({ isEachUpdatesSettingConfigurable }) =>
    isEachUpdatesSettingConfigurable,
  isUpdatingEnabled: ({ isUpdatingEnabled }) => isUpdatingEnabled,
  isHardwareAccelerationEnabled: ({ isHardwareAccelerationEnabled }) =>
    isHardwareAccelerationEnabled,
  externalProtocols: ({ externalProtocols }) => externalProtocols,
  allowedJitsiServers: ({ allowedJitsiServers }) => allowedJitsiServers,
  isReportEnabled: ({ isReportEnabled }) => isReportEnabled,
  isFlashFrameEnabled: ({ isFlashFrameEnabled }) => isFlashFrameEnabled,
  isInternalVideoChatWindowEnabled: ({ isInternalVideoChatWindowEnabled }) =>
    isInternalVideoChatWindowEnabled,
  isMinimizeOnCloseEnabled: ({ isMinimizeOnCloseEnabled }) =>
    isMinimizeOnCloseEnabled,
  isAddNewServersEnabled: ({ isAddNewServersEnabled }) =>
    isAddNewServersEnabled,
  hasHideOnTrayNotificationShown: ({ hasHideOnTrayNotificationShown }) =>
    hasHideOnTrayNotificationShown,
});
