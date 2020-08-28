import { combineReducers } from 'redux';

import { appPath } from '../app/reducers/appPath';
import { appVersion } from '../app/reducers/appVersion';
import {
  clientCertificates,
  trustedCertificates,
} from '../navigation/reducers';
import {
  currentServerUrl,
  servers,
} from '../servers/reducers';
import { spellCheckingDictionaries } from '../spellChecking/reducers';
import { isMenuBarEnabled } from '../ui/reducers/isMenuBarEnabled';
import { isMessageBoxFocused } from '../ui/reducers/isMessageBoxFocused';
import { isShowWindowOnUnreadChangedEnabled } from '../ui/reducers/isShowWindowOnUnreadChangedEnabled';
import { isSideBarEnabled } from '../ui/reducers/isSideBarEnabled';
import { isTrayIconEnabled } from '../ui/reducers/isTrayIconEnabled';
import { mainWindowState } from '../ui/reducers/mainWindowState';
import { openDialog } from '../ui/reducers/openDialog';
import {
  doCheckForUpdatesOnStartup,
  isCheckingForUpdates,
  isEachUpdatesSettingConfigurable,
  isUpdatingAllowed,
  isUpdatingEnabled,
  newUpdateVersion,
  skippedUpdateVersion,
  updateError,
} from '../updates/reducers';

const reducersMap = {
  appPath,
  appVersion,
  clientCertificates,
  currentServerUrl,
  doCheckForUpdatesOnStartup,
  isCheckingForUpdates,
  isEachUpdatesSettingConfigurable,
  isMenuBarEnabled,
  isMessageBoxFocused,
  isShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled,
  isTrayIconEnabled,
  isUpdatingAllowed,
  isUpdatingEnabled,
  mainWindowState,
  newUpdateVersion,
  openDialog,
  servers,
  skippedUpdateVersion,
  spellCheckingDictionaries,
  trustedCertificates,
  updateError,
};

export const rootReducer = combineReducers<typeof reducersMap>(reducersMap);

export type RootState = ReturnType<typeof rootReducer>;
