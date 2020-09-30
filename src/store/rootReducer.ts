import { combineReducers } from 'redux';

import { appPath } from '../app/reducers/appPath';
import { appVersion } from '../app/reducers/appVersion';
import {
  clientCertificates,
  externalProtocols,
  trustedCertificates,
} from '../navigation/reducers';
import {
  currentServerUrl,
  servers,
} from '../servers/reducers';
import { isMenuBarEnabled } from '../ui/reducers/isMenuBarEnabled';
import { isMessageBoxFocused } from '../ui/reducers/isMessageBoxFocused';
import { isShowWindowOnUnreadChangedEnabled } from '../ui/reducers/isShowWindowOnUnreadChangedEnabled';
import { isSideBarEnabled } from '../ui/reducers/isSideBarEnabled';
import { isTrayIconEnabled } from '../ui/reducers/isTrayIconEnabled';
import { openDialog } from '../ui/reducers/openDialog';
import { rootWindowIcon } from '../ui/reducers/rootWindowIcon';
import { rootWindowState } from '../ui/reducers/rootWindowState';
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
  externalProtocols,
  isCheckingForUpdates,
  isEachUpdatesSettingConfigurable,
  isMenuBarEnabled,
  isMessageBoxFocused,
  isShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled,
  isTrayIconEnabled,
  isUpdatingAllowed,
  isUpdatingEnabled,
  newUpdateVersion,
  openDialog,
  rootWindowIcon,
  rootWindowState,
  servers,
  skippedUpdateVersion,
  trustedCertificates,
  updateError,
};

export const rootReducer = combineReducers<typeof reducersMap>(reducersMap);

export type RootState = ReturnType<typeof rootReducer>;
