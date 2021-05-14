import { combineReducers } from 'redux';

import { appReducer } from './appReducer';
import { currentView } from './currentViewReducer';
import { downloads } from './downloadsReducer';
import { isMenuBarEnabled } from './isMenuBarEnabledReducer';
import { isMessageBoxFocused } from './isMessageBoxFocusedReducer';
import { isShowWindowOnUnreadChangedEnabled } from './isShowWindowOnUnreadChangedEnabledReducer';
import { isSideBarEnabled } from './isSideBarEnabledReducer';
import { isTrayIconEnabled } from './isTrayIconEnabledReducer';
import {
  clientCertificates,
  externalProtocols,
  trustedCertificates,
} from './navigationReducers';
import { openDialog } from './openDialogReducer';
import { rootWindowIcon } from './rootWindowIconReducer';
import { rootWindowState } from './rootWindowStateReducer';
import { servers } from './serversReducer';
import {
  doCheckForUpdatesOnStartup,
  isCheckingForUpdates,
  isEachUpdatesSettingConfigurable,
  isUpdatingAllowed,
  isUpdatingEnabled,
  newUpdateVersion,
  skippedUpdateVersion,
  updateError,
} from './updatesReducers';

export const rootReducer = combineReducers({
  app: appReducer,
  clientCertificates,
  currentView,
  doCheckForUpdatesOnStartup,
  downloads,
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
});
