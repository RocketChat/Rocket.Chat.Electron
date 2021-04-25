import type { Certificate } from 'electron';

import { Download } from '../downloads/common';
import { Server } from '../servers/common';
import { WindowState } from '../ui/common';

type PersistableValues_0_0_0 = {
  currentServerUrl: string;
  currentView: 'add-new-server' | null;
  doCheckForUpdatesOnStartup: boolean;
  externalProtocols: Record<string, boolean>;
  isEachUpdatesSettingConfigurable: boolean;
  isMenuBarEnabled: boolean;
  isShowWindowOnUnreadChangedEnabled: boolean;
  isSideBarEnabled: boolean;
  isTrayIconEnabled: boolean;
  isUpdatingEnabled: boolean;
  rootWindowState: WindowState;
  servers: Server[];
  skippedUpdateVersion: string | null;
  trustedCertificates: Record<Server['url'], Certificate['fingerprint']>;
};

type PersistableValues_3_1_0 = Omit<
  PersistableValues_0_0_0,
  'currentServerUrl' | 'currentView'
> & {
  currentView?:
    | Exclude<PersistableValues_0_0_0['currentView'], null>
    | { url: string }
    | 'downloads';
  downloads?: Record<Download['itemId'], Download>;
};

export type PersistableValues = Pick<
  PersistableValues_3_1_0,
  keyof PersistableValues_3_1_0
>;

export const migrations = {
  '>=3.1.0': (before: PersistableValues_0_0_0): PersistableValues_3_1_0 => {
    const { currentServerUrl, ...rest } = before;

    return {
      ...rest,
      currentView: currentServerUrl
        ? { url: currentServerUrl }
        : rest.currentView ?? 'add-new-server',
      downloads: {},
    };
  },
};
