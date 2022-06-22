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
};

export type AppLevelUpdateConfiguration = {
  forced?: boolean;
  canUpdate?: boolean;
  autoUpdate?: boolean;
  skip?: string | null;
};

export type UserLevelUpdateConfiguration = {
  autoUpdate?: boolean;
  skip?: string | null;
};
