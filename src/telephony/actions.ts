export const TELEPHONY_PREFERRED_SERVER_SET = 'telephony/preferred-server-set';
export const TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET =
  'telephony/global-shortcut-config-set';
export const TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED =
  'telephony/global-shortcut-registration-changed';

export type TelephonyGlobalShortcutConfig = {
  enabled: boolean;
  accelerator: string | null;
};

export type TelephonyGlobalShortcutRegistrationStatus = {
  registered: boolean;
  accelerator: string | null;
  error: string | null;
};

export type TelephonyActionTypeToPayloadMap = {
  [TELEPHONY_PREFERRED_SERVER_SET]: string | null;
  [TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET]: TelephonyGlobalShortcutConfig;
  [TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED]: TelephonyGlobalShortcutRegistrationStatus;
};
