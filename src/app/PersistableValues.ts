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

type PersistableValues_4_7_2 = PersistableValues_4_5_0 & {
  isVideoCallDevtoolsAutoOpenEnabled: boolean;
};

type PersistableValues_4_9_0 = PersistableValues_4_7_2 & {
  isVideoCallScreenCaptureFallbackEnabled: boolean;
};

// Add screen lock persisted settings: timeout (seconds) and passwordHash (now an object with algorithm, hash, salt, params)
export type ScreenLockPasswordStored = {
  algorithm: string; // e.g. 'scrypt', 'pbkdf2', 'legacy-sha256'
  hash: string; // base64 encoded derived key or legacy hex encoded then base64
  salt: string; // base64 encoded salt (or empty string for legacy where salt wasn't used)
  params?: Record<string, any>; // algorithm-specific params (iterations, keylen, maxmem, digest, etc.)
};

type PersistableValues_5_0_0 = PersistableValues_4_9_0 & {
  screenLockTimeoutSeconds: number; // 0 = disabled
  screenLockPasswordHash: ScreenLockPasswordStored | null;
  isScreenLocked: boolean; // new: lock state across restarts
};

export type PersistableValues = Pick<
  PersistableValues_5_0_0,
  keyof PersistableValues_5_0_0
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
  '>=4.7.2': (before: PersistableValues_4_5_0): PersistableValues_4_7_2 => ({
    ...before,
    isVideoCallDevtoolsAutoOpenEnabled: false,
  }),
  '>=4.9.0': (before: PersistableValues_4_7_2): PersistableValues_4_9_0 => ({
    ...before,
    isVideoCallScreenCaptureFallbackEnabled: false,
  }),
  // New migration for screen lock defaults (initial addition)
  '>=5.0.0': (before: PersistableValues_4_9_0): PersistableValues_5_0_0 => ({
    ...before,
    screenLockTimeoutSeconds: 0,
    screenLockPasswordHash: null,
    isScreenLocked: false,
  }),
  // Convert older plain sha256 hex or legacy pbkdf2 string into structured object
  '>=5.0.1': (before: any): PersistableValues_5_0_0 => {
    // If there is no prior screen lock value, keep as null
    const raw = before?.screenLockPasswordHash || null;

    if (!raw) {
      return {
        ...before,
        screenLockTimeoutSeconds: before.screenLockTimeoutSeconds ?? 0,
        screenLockPasswordHash: null,
        isScreenLocked: before.isScreenLocked ?? false,
      } as PersistableValues_5_0_0;
    }

    // If already an object with algorithm, assume it's in new format
    if (typeof raw === 'object' && raw.algorithm) {
      return {
        ...before,
        screenLockTimeoutSeconds: before.screenLockTimeoutSeconds ?? 0,
        screenLockPasswordHash: raw as ScreenLockPasswordStored,
        isScreenLocked: before.isScreenLocked ?? false,
      } as PersistableValues_5_0_0;
    }

    // If string: could be legacy sha256 hex (64 hex chars) or our old pbkdf2$... encoded string
    if (typeof raw === 'string') {
      // pbkdf2 encoded string format: pbkdf2$<digest>$i=<iterations>$s=<saltHex>$d=<derivedHex>
      const pbkdf2Match =
        /^pbkdf2\$(\w+)\$i=(\d+)\$s=([0-9a-f]+)\$d=([0-9a-f]+)$/.exec(raw);
      if (pbkdf2Match) {
        const [, digest, itStr, saltHex, derivedHex] = pbkdf2Match;
        const saltBuf = Buffer.from(saltHex, 'hex');
        const derivedBuf = Buffer.from(derivedHex, 'hex');
        return {
          ...before,
          screenLockTimeoutSeconds: before.screenLockTimeoutSeconds ?? 0,
          screenLockPasswordHash: {
            algorithm: 'pbkdf2',
            hash: derivedBuf.toString('base64'),
            salt: saltBuf.toString('base64'),
            params: {
              iterations: Number(itStr),
              digest,
              keylen: derivedBuf.length,
            },
          },
          isScreenLocked: before.isScreenLocked ?? false,
        } as PersistableValues_5_0_0;
      }

      // legacy unsalted sha256 hex
      if (/^[0-9a-f]{64}$/.test(raw)) {
        const buf = Buffer.from(raw, 'hex');
        return {
          ...before,
          screenLockTimeoutSeconds: before.screenLockTimeoutSeconds ?? 0,
          screenLockPasswordHash: {
            algorithm: 'legacy-sha256',
            hash: buf.toString('base64'),
            salt: '',
            params: {},
          },
          isScreenLocked: before.isScreenLocked ?? false,
        } as PersistableValues_5_0_0;
      }
    }

    // Unknown format — drop it and require user to reset password
    return {
      ...before,
      screenLockTimeoutSeconds: before.screenLockTimeoutSeconds ?? 0,
      screenLockPasswordHash: null,
      isScreenLocked: before.isScreenLocked ?? false,
    } as PersistableValues_5_0_0;
  },
};
