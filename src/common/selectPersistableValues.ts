import { createStructuredSelector } from 'reselect';

import type { PersistableValues } from './types/PersistableValues';
import type { RootState } from './types/RootState';

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
  isEachUpdatesSettingConfigurable: ({ isEachUpdatesSettingConfigurable }) =>
    isEachUpdatesSettingConfigurable,
  isUpdatingEnabled: ({ isUpdatingEnabled }) => isUpdatingEnabled,
  externalProtocols: ({ externalProtocols }) => externalProtocols,
});
