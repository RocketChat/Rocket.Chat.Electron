import { createStructuredSelector } from 'reselect';

export const selectPersistableValues = createStructuredSelector({
  currentServerUrl: ({ currentServerUrl }) => currentServerUrl,
  doCheckForUpdatesOnStartup: ({ doCheckForUpdatesOnStartup }) => doCheckForUpdatesOnStartup,
  isMenuBarEnabled: ({ isMenuBarEnabled }) => isMenuBarEnabled,
  isShowWindowOnUnreadChangedEnabled: ({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled: ({ isSideBarEnabled }) => isSideBarEnabled,
  isTrayIconEnabled: ({ isTrayIconEnabled }) => isTrayIconEnabled,
  mainWindowState: ({ mainWindowState }) => mainWindowState,
  servers: ({ servers }) => servers,
  spellCheckingDictionaries: ({ spellCheckingDictionaries }) => spellCheckingDictionaries,
  skippedUpdateVersion: ({ skippedUpdateVersion }) => skippedUpdateVersion,
  trustedCertificates: ({ trustedCertificates }) => trustedCertificates,
  isEachUpdatesSettingConfigurable: ({ isEachUpdatesSettingConfigurable }) => isEachUpdatesSettingConfigurable,
  isUpdatingEnabled: ({ isUpdatingEnabled }) => isUpdatingEnabled,
});
