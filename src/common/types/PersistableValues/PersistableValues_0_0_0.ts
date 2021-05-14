import type { Certificate } from 'electron';

import type { Server } from '../Server';
import type { WindowState } from '../WindowState';

export type PersistableValues_0_0_0 = {
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
