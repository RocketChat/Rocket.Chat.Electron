import type { PersistableValues } from './PersistableValues';

export const APP_ERROR_THROWN = 'app/error-thrown';
export const APP_PATH_SET = 'app/path-set';
export const APP_VERSION_SET = 'app/version-set';
export const APP_SETTINGS_LOADED = 'app/settings-loaded';
export const APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET =
  'app/allowed-ntlm-credentials-domains-set';

export type AppActionTypeToPayloadMap = {
  [APP_ERROR_THROWN]: Error;
  [APP_PATH_SET]: string;
  [APP_VERSION_SET]: string;
  [APP_SETTINGS_LOADED]: Partial<PersistableValues>;
  [APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET]: string;
};
