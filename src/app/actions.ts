import type { PersistableValues } from './PersistableValues';

export const APP_ERROR_THROWN = 'app/error-thrown';
export const APP_PATH_SET = 'app/path-set';
export const APP_VERSION_SET = 'app/version-set';
export const APP_SETTINGS_LOADED = 'app/settings-loaded';
export const APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET =
  'app/allowed-ntlm-credentials-domains-set';
export const APP_MAIN_WINDOW_TITLE_SET = 'app/main-window-title-set';
export const APP_MACHINE_THEME_SET = 'app/machine-theme-set';
export const APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET =
  'app/screen-capture-fallback-forced-set';

export type OverrideOnlySettings = {
  allowInsecureOutlookConnections?: boolean;
  outlookCalendarSyncIntervalOverride?: number | null;
};

export type AppActionTypeToPayloadMap = {
  [APP_ERROR_THROWN]: Error;
  [APP_PATH_SET]: string;
  [APP_VERSION_SET]: string;
  [APP_SETTINGS_LOADED]: Partial<PersistableValues> & OverrideOnlySettings;
  [APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET]: string;
  [APP_MAIN_WINDOW_TITLE_SET]: string;
  [APP_MACHINE_THEME_SET]: string;
  [APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET]: boolean;
};
