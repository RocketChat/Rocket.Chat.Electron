import { createStructuredSelector } from 'reselect';

import type { PersistableValues } from './types/PersistableValues';
import type { RootState } from './types/RootState';

export const selectPersistableValues = createStructuredSelector<
  RootState,
  PersistableValues
>({
  currentView: ({ currentView }) => currentView,
  downloads: ({ downloads }) => downloads,
  isMenuBarEnabled: ({ isMenuBarEnabled }) => isMenuBarEnabled,
  isShowWindowOnUnreadChangedEnabled: ({
    isShowWindowOnUnreadChangedEnabled,
  }) => isShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled: ({ isSideBarEnabled }) => isSideBarEnabled,
  isTrayIconEnabled: ({ isTrayIconEnabled }) => isTrayIconEnabled,
  rootWindowState: ({ rootWindowState }) => rootWindowState,
  servers: ({ servers }) => servers,
  trustedCertificates: ({ trustedCertificates }) => trustedCertificates,
  externalProtocols: ({ externalProtocols }) => externalProtocols,
  isUpdatingEnabled: (state) => state.updates.settings.enabled,
  isEachUpdatesSettingConfigurable: (state) => state.updates.settings.editable,
  doCheckForUpdatesOnStartup: (state) => state.updates.settings.checkOnStartup,
  skippedUpdateVersion: (state) => state.updates.settings.skippedVersion,
});
