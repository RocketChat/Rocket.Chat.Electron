import { createStructuredSelector } from 'reselect';

import { ActionOf } from '../store/actions';
import { RootState } from '../store/rootReducer';
import { APP_SETTINGS_LOADED } from './actions';

export const selectPersistableValues = createStructuredSelector<Partial<RootState>, ActionOf<typeof APP_SETTINGS_LOADED>['payload']>({
  currentView: ({ currentView }) => currentView,
  doCheckForUpdatesOnStartup: ({ doCheckForUpdatesOnStartup }) => doCheckForUpdatesOnStartup,
  downloads: ({ downloads }) => downloads,
  isMenuBarEnabled: ({ isMenuBarEnabled }) => isMenuBarEnabled,
  isShowWindowOnUnreadChangedEnabled: ({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled: ({ isSideBarEnabled }) => isSideBarEnabled,
  isTrayIconEnabled: ({ isTrayIconEnabled }) => isTrayIconEnabled,
  rootWindowState: ({ rootWindowState }) => rootWindowState,
  servers: ({ servers }) => servers,
  skippedUpdateVersion: ({ skippedUpdateVersion }) => skippedUpdateVersion,
  trustedCertificates: ({ trustedCertificates }) => trustedCertificates,
  isEachUpdatesSettingConfigurable: ({ isEachUpdatesSettingConfigurable }) => isEachUpdatesSettingConfigurable,
  isUpdatingEnabled: ({ isUpdatingEnabled }) => isUpdatingEnabled,
  externalProtocols: ({ externalProtocols }) => externalProtocols,
});
