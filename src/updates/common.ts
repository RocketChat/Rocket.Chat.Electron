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
};

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
