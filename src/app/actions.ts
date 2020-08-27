import { Certificate } from 'electron';

import { Server } from '../servers/common';
import { Dictionary } from '../spellChecking/common';
import { WindowState } from '../ui/common';

export const APP_ERROR_THROWN = 'app/error-thrown';
export const APP_PATH_SET = 'app/path-set';
export const APP_VERSION_SET = 'app/version-set';
export const PERSISTABLE_VALUES_MERGED = 'persistable-values/merged';

export type AppActionTypeToPayloadMap = {
  [APP_ERROR_THROWN]: Error;
  [APP_PATH_SET]: string;
  [APP_VERSION_SET]: string;
  [PERSISTABLE_VALUES_MERGED]: {
    currentServerUrl: Server['url'] | null;
    doCheckForUpdatesOnStartup: boolean;
    isEachUpdatesSettingConfigurable: boolean;
    isMenuBarEnabled: boolean;
    isShowWindowOnUnreadChangedEnabled: boolean;
    isSideBarEnabled: boolean;
    isTrayIconEnabled: boolean;
    isUpdatingEnabled: boolean;
    mainWindowState: WindowState;
    servers: Server[];
    skippedUpdateVersion: string | null;
    spellCheckingDictionaries: Dictionary[];
    trustedCertificates: Record<Server['url'], Certificate['fingerprint']>;
  };
};
