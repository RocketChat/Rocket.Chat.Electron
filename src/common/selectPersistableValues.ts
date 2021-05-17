import { createStructuredSelector } from 'reselect';

import type { PersistableValues } from './types/PersistableValues';
import type { RootState } from './types/RootState';

export const selectPersistableValues = createStructuredSelector<
  RootState,
  PersistableValues
>({
  currentView: ({ ui: { view } }) => view,
  downloads: ({ downloads }) => downloads,
  isMenuBarEnabled: (state) => state.ui.menuBar.enabled,
  isShowWindowOnUnreadChangedEnabled: (state) =>
    state.ui.rootWindow.showOnBadgeChange,
  isSideBarEnabled: (state) => state.ui.sideBar.enabled,
  isTrayIconEnabled: (state) => state.ui.trayIcon.enabled,
  rootWindowState: (state) => state.ui.rootWindow.state,
  servers: (state) => state.servers,
  trustedCertificates: ({ trustedCertificates }) => trustedCertificates,
  externalProtocols: ({ externalProtocols }) => externalProtocols,
  isUpdatingEnabled: (state) => state.updates.settings.enabled,
  isEachUpdatesSettingConfigurable: (state) => state.updates.settings.editable,
  doCheckForUpdatesOnStartup: (state) => state.updates.settings.checkOnStartup,
  skippedUpdateVersion: (state) => state.updates.settings.skippedVersion,
});
