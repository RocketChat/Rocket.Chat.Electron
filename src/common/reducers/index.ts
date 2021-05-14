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
import { updatesReducer } from './updatesReducer';

export const rootReducer = combineReducers({
  app: appReducer,
  updates: updatesReducer,
  clientCertificates,
  currentView,
  downloads,
  externalProtocols,
  isMenuBarEnabled,
  isMessageBoxFocused,
  isShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled,
  isTrayIconEnabled,
  openDialog,
  rootWindowIcon,
  rootWindowState,
  servers,
  trustedCertificates,
});
