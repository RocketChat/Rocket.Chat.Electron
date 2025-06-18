import type { Certificate } from 'electron';

import type { Download } from '../downloads/common';
import type { Server } from '../servers/common';
import type { WindowState } from '../ui/common';

type PersistableValues_0_0_0 = {
  currentServerUrl: string;
  currentView: 'add-new-server' | null;
  doCheckForUpdatesOnStartup: boolean;
  allowedJitsiServers: Record<string, boolean>;
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
  notTrustedCertificates: Record<Server['url'], Certificate['fingerprint']>;
};

type PersistableValues_3_1_0 = Omit<
  PersistableValues_0_0_0,
  'currentServerUrl' | 'currentView'
> & {
  currentView?:
    | Exclude<PersistableValues_0_0_0['currentView'], null>
    | { url: string }
    | 'downloads'
    | 'settings';
  downloads?: Record<Download['itemId'], Download>;
};
type PersistableValues_3_5_0 = PersistableValues_3_1_0 & {
  isReportEnabled: boolean;
  isFlashFrameEnabled: boolean;
  isInternalVideoChatWindowEnabled: boolean;
};

type PersistableValues_3_7_9 = PersistableValues_3_5_0 & {
  isMinimizeOnCloseEnabled: boolean;
};

type PersistableValues_3_8_1 = PersistableValues_3_7_9;

type PersistableValues_3_8_4 = PersistableValues_3_8_1 & {
  isAddNewServersEnabled: boolean;
};

type PersistableValues_3_8_7 = PersistableValues_3_8_4 & {
  isHardwareAccelerationEnabled: boolean;
};

type PersistableValues_3_8_9 = PersistableValues_3_8_7;

type PersistableValues_3_8_12 = PersistableValues_3_8_9 & {
  hasHideOnTrayNotificationShown: boolean;
};

type PersistableValues_3_9_6 = PersistableValues_3_8_12 & {
  lastSelectedServerUrl: string;
  allowedNTLMCredentialsDomains: string | null;
  isNTLMCredentialsEnabled: boolean;
};

type PersistableValues_4_1_0 = PersistableValues_3_9_6 & {
  mainWindowTitle: string | null;
  machineTheme: string | null;
};

type PersistableValues_4_2_0 = PersistableValues_4_1_0 & {
  selectedBrowser: string | null;
};

type PersistableValues_4_4_0 = PersistableValues_4_2_0 & {
  isDeveloperModeEnabled: boolean;
};

type PersistableValues_4_5_0 = PersistableValues_4_4_0 & {
  updateChannel: string;
};

export type PersistableValues = Pick<
  PersistableValues_4_5_0,
  keyof PersistableValues_4_5_0
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
  '>=3.5.0': (before: PersistableValues_3_1_0): PersistableValues_3_5_0 => ({
    ...before,
    isReportEnabled: true,
    isInternalVideoChatWindowEnabled: true,
    isFlashFrameEnabled:
      process.platform === 'win32' || process.platform === 'darwin',
  }),
  '>=3.7.9': (before: PersistableValues_3_5_0): PersistableValues_3_7_9 => ({
    ...before,
    isMinimizeOnCloseEnabled: process.platform === 'win32',
  }),
  '>=3.8.0': (before: PersistableValues_3_7_9): PersistableValues_3_8_1 => ({
    ...before,
    isReportEnabled: !process.mas,
  }),
  '>=3.8.4': (before: PersistableValues_3_8_1): PersistableValues_3_8_4 => ({
    ...before,
    isInternalVideoChatWindowEnabled: !process.mas,
    isAddNewServersEnabled: true,
  }),
  '>=3.8.7': (before: PersistableValues_3_8_4): PersistableValues_3_8_7 => ({
    ...before,
    isHardwareAccelerationEnabled: true,
  }),
  '>=3.8.9': (before: PersistableValues_3_8_7): PersistableValues_3_8_9 => ({
    ...before,
    isAddNewServersEnabled: true,
  }),
  '>=3.8.12': (before: PersistableValues_3_8_9): PersistableValues_3_8_12 => ({
    ...before,
    hasHideOnTrayNotificationShown: false,
  }),
  '>=3.9.6': (before: PersistableValues_3_8_12): PersistableValues_3_9_6 => ({
    ...before,
    isNTLMCredentialsEnabled: false,
    allowedNTLMCredentialsDomains: null,
    lastSelectedServerUrl: '',
  }),
  '>=4.1.0': (before: PersistableValues_3_9_6): PersistableValues_4_1_0 => ({
    ...before,
    mainWindowTitle: 'Rocket.Chat',
    machineTheme: 'light',
  }),
  '>=4.2.0': (before: PersistableValues_4_1_0): PersistableValues_4_2_0 => ({
    ...before,
    selectedBrowser: null,
  }),
  '>=4.4.0': (before: PersistableValues_4_2_0): PersistableValues_4_4_0 => ({
    ...before,
    isDeveloperModeEnabled: false,
  }),
  '>=4.5.0': (before: PersistableValues_4_4_0): PersistableValues_4_5_0 => ({
    ...before,
    updateChannel: 'latest',
  }),
};
