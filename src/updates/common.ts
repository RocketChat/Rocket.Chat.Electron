export type UpdateConfiguration = {
  doCheckForUpdatesOnStartup: boolean;
  isEachUpdatesSettingConfigurable: boolean;
  isUpdatingAllowed: boolean;
  isUpdatingEnabled: boolean;
  skippedUpdateVersion: string | null;
  isReportEnabled: boolean;
  isHardwareAccelerationEnabled: boolean;
  isFlashFrameEnabled: boolean;
  isInternalVideoChatWindowEnabled: boolean;
  isVideoCallScreenCaptureFallbackEnabled: boolean;
  updateChannel: string;
  updateStore: UpdateStore;
};

/**
 * Which store-flavored update flow the current build uses, if any — routes
 * update checks through the store's own lookup/page instead of
 * electron-updater. `'mas'` (Mac App Store), `'windows'` (Microsoft Store),
 * `'snap'` (Snap Store), `'flatpak'` (Flathub).
 */
export type UpdateStore = 'mas' | 'windows' | 'snap' | 'flatpak' | null;

export type AppLevelUpdateConfiguration = {
  forced?: boolean;
  canUpdate?: boolean;
  autoUpdate?: boolean;
  skip?: string | null;
  channel?: string;
};

export type UserLevelUpdateConfiguration = {
  autoUpdate?: boolean;
  skip?: string | null;
  channel?: string;
};

export const UPDATE_CHANNELS = ['latest', 'beta', 'alpha'] as const;
export type UpdateChannel = (typeof UPDATE_CHANNELS)[number];

/**
 * Download phase of an available update, driving the titlebar update label:
 * `idle` (available, not downloading yet) → `downloading` → `downloaded`.
 */
export type UpdateDownloadStatus = 'idle' | 'downloading' | 'downloaded';

/**
 * Outcome of a user-initiated update check, driving the transient titlebar
 * feedback label: `idle` (nothing to show) → `checking` → `upToDate` |
 * `failed`. Startup auto-checks never dispatch the requested action, so they
 * stay at `idle` and produce no titlebar feedback.
 */
export type UpdateCheckStatus = 'idle' | 'checking' | 'upToDate' | 'failed';
