import { combineReducers } from 'redux';

import { allowedNTLMCredentialsDomains } from '../app/reducers/allowedNTLMCredentialsDomains';
import { appPath } from '../app/reducers/appPath';
import { appVersion } from '../app/reducers/appVersion';
import { machineTheme } from '../app/reducers/machineTheme';
import { mainWindowTitle } from '../app/reducers/mainWindowTitle';
import { downloads } from '../downloads/reducers/downloads';
import { allowedJitsiServers } from '../jitsi/reducers';
import {
  clientCertificates,
  externalProtocols,
  trustedCertificates,
  notTrustedCertificates,
} from '../navigation/reducers';
import { servers } from '../servers/reducers';
import { availableBrowsers } from '../ui/reducers/availableBrowsers';
import { currentView } from '../ui/reducers/currentView';
import { hasHideOnTrayNotificationShown } from '../ui/reducers/hasHideOnTrayNotificationShown';
import { isAddNewServersEnabled } from '../ui/reducers/isAddNewServersEnabled';
import { isDeveloperModeEnabled } from '../ui/reducers/isDeveloperModeEnabled';
import { isFlashFrameEnabled } from '../ui/reducers/isFlashFrameEnabled';
import { isHardwareAccelerationEnabled } from '../ui/reducers/isHardwareAccelerationEnabled';
import { isInternalVideoChatWindowEnabled } from '../ui/reducers/isInternalVideoChatWindowEnabled';
import { isMenuBarEnabled } from '../ui/reducers/isMenuBarEnabled';
import { isMessageBoxFocused } from '../ui/reducers/isMessageBoxFocused';
import { isMinimizeOnCloseEnabled } from '../ui/reducers/isMinimizeOnCloseEnabled';
import { isNTLMCredentialsEnabled } from '../ui/reducers/isNTLMCredentialsEnabled';
import { isReportEnabled } from '../ui/reducers/isReportEnabled';
import { isShowWindowOnUnreadChangedEnabled } from '../ui/reducers/isShowWindowOnUnreadChangedEnabled';
import { isSideBarEnabled } from '../ui/reducers/isSideBarEnabled';
import { isTrayIconEnabled } from '../ui/reducers/isTrayIconEnabled';
import { isVideoCallWindowPersistenceEnabled } from '../ui/reducers/isVideoCallWindowPersistenceEnabled';
import { lastSelectedServerUrl } from '../ui/reducers/lastSelectedServerUrl';
import { openDialog } from '../ui/reducers/openDialog';
import { rootWindowIcon } from '../ui/reducers/rootWindowIcon';
import { rootWindowState } from '../ui/reducers/rootWindowState';
import { selectedBrowser } from '../ui/reducers/selectedBrowser';
import { videoCallWindowState } from '../ui/reducers/videoCallWindowState';
import {
  doCheckForUpdatesOnStartup,
  isCheckingForUpdates,
  isEachUpdatesSettingConfigurable,
  isUpdatingAllowed,
  isUpdatingEnabled,
  newUpdateVersion,
  skippedUpdateVersion,
  updateError,
  updateChannel,
} from '../updates/reducers';

export const rootReducer = combineReducers({
  allowedJitsiServers,
  appPath,
  appVersion,
  availableBrowsers,
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
  isMinimizeOnCloseEnabled,
  isUpdatingAllowed,
  isUpdatingEnabled,
  mainWindowTitle,
  machineTheme,
  newUpdateVersion,
  openDialog,
  rootWindowIcon,
  rootWindowState,
  selectedBrowser,
  servers,
  skippedUpdateVersion,
  trustedCertificates,
  notTrustedCertificates,
  updateError,
  isReportEnabled,
  isFlashFrameEnabled,
  isHardwareAccelerationEnabled,
  isInternalVideoChatWindowEnabled,
  isAddNewServersEnabled,
  hasHideOnTrayNotificationShown,
  lastSelectedServerUrl,
  allowedNTLMCredentialsDomains,
  isNTLMCredentialsEnabled,
  videoCallWindowState,
  isVideoCallWindowPersistenceEnabled,
  isDeveloperModeEnabled,
  updateChannel,
});

export type RootState = ReturnType<typeof rootReducer>;
