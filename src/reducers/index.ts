import { combineReducers } from 'redux';

import { appPath } from './appPath';
import { appVersion } from './appVersion';
import { clientCertificates } from './clientCertificates';
import { currentServerUrl } from './currentServerUrl';
import { doCheckForUpdatesOnStartup } from './doCheckForUpdatesOnStartup';
import { editFlags } from './editFlags';
import { focusedWebContentsId } from './focusedWebContentsId';
import { isCheckingForUpdates } from './isCheckingForUpdates';
import { isEachUpdatesSettingConfigurable } from './isEachUpdatesSettingConfigurable';
import { isMenuBarEnabled } from './isMenuBarEnabled';
import { isMessageBoxFocused } from './isMessageBoxFocused';
import { isShowWindowOnUnreadChangedEnabled } from './isShowWindowOnUnreadChangedEnabled';
import { isSideBarEnabled } from './isSideBarEnabled';
import { isTrayIconEnabled } from './isTrayIconEnabled';
import { isUpdatingAllowed } from './isUpdatingAllowed';
import { isUpdatingEnabled } from './isUpdatingEnabled';
import { mainWindowState } from './mainWindowState';
import { newUpdateVersion } from './newUpdateVersion';
import { openDialog } from './openDialog';
import { servers } from './servers';
import { skippedUpdateVersion } from './skippedUpdateVersion';
import { spellCheckingDictionaries } from './spellCheckingDictionaries';
import { trustedCertificates } from './trustedCertificates';
import { updateError } from './updateError';

export const rootReducer = combineReducers({
  appPath,
  appVersion,
  clientCertificates,
  currentServerUrl,
  doCheckForUpdatesOnStartup,
  editFlags,
  focusedWebContentsId,
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
});

export type RootState = ReturnType<typeof rootReducer>;
