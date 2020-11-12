import { downloads } from '../downloads/reducers/downloads';
import {
  externalProtocols,
  trustedCertificates,
} from '../navigation/reducers';
import { servers } from '../servers/reducers';
import { currentView } from '../ui/reducers/currentView';
import { isMenuBarEnabled } from '../ui/reducers/isMenuBarEnabled';
import { isShowWindowOnUnreadChangedEnabled } from '../ui/reducers/isShowWindowOnUnreadChangedEnabled';
import { isSideBarEnabled } from '../ui/reducers/isSideBarEnabled';
import { isTrayIconEnabled } from '../ui/reducers/isTrayIconEnabled';
import { rootWindowState } from '../ui/reducers/rootWindowState';
import {
  doCheckForUpdatesOnStartup,
  isEachUpdatesSettingConfigurable,
  isUpdatingEnabled,
  skippedUpdateVersion,
} from '../updates/reducers';

export const APP_ERROR_THROWN = 'app/error-thrown';
export const APP_PATH_SET = 'app/path-set';
export const APP_VERSION_SET = 'app/version-set';
export const APP_SETTINGS_LOADED = 'app/settings-loaded';

export type AppActionTypeToPayloadMap = {
  [APP_ERROR_THROWN]: Error;
  [APP_PATH_SET]: string;
  [APP_VERSION_SET]: string;
  [APP_SETTINGS_LOADED]: {
    currentView: ReturnType<typeof currentView>;
    doCheckForUpdatesOnStartup: ReturnType<typeof doCheckForUpdatesOnStartup>;
    downloads: ReturnType<typeof downloads>;
    externalProtocols: ReturnType<typeof externalProtocols>;
    isEachUpdatesSettingConfigurable: ReturnType<typeof isEachUpdatesSettingConfigurable>;
    isMenuBarEnabled: ReturnType<typeof isMenuBarEnabled>;
    isShowWindowOnUnreadChangedEnabled: ReturnType<typeof isShowWindowOnUnreadChangedEnabled>;
    isSideBarEnabled: ReturnType<typeof isSideBarEnabled>;
    isTrayIconEnabled: ReturnType<typeof isTrayIconEnabled>;
    isUpdatingEnabled: ReturnType<typeof isUpdatingEnabled>;
    rootWindowState: ReturnType<typeof rootWindowState>;
    servers: ReturnType<typeof servers>;
    skippedUpdateVersion: ReturnType<typeof skippedUpdateVersion>;
    trustedCertificates: ReturnType<typeof trustedCertificates>;
  };
};
