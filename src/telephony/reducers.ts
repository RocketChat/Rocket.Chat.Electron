import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../app/actions';
import type { ActionOf } from '../store/actions';
import {
  TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET,
  TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED,
  TELEPHONY_PREFERRED_SERVER_SET,
} from './actions';
import type {
  TelephonyGlobalShortcutConfig,
  TelephonyGlobalShortcutRegistrationStatus,
} from './actions';
import { normalizeTelephonyShortcutAccelerator } from './shortcuts';

type TelephonyPreferredServerAction =
  | ActionOf<typeof TELEPHONY_PREFERRED_SERVER_SET>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

type TelephonyGlobalShortcutConfigAction =
  | ActionOf<typeof TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

type TelephonyGlobalShortcutRegistrationStatusAction = ActionOf<
  typeof TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED
>;

export const defaultTelephonyGlobalShortcutConfig: TelephonyGlobalShortcutConfig =
  {
    enabled: false,
    accelerator: null,
  };

export const defaultTelephonyGlobalShortcutRegistrationStatus: TelephonyGlobalShortcutRegistrationStatus =
  {
    registered: false,
    accelerator: null,
    error: null,
  };

const normalizeTelephonyGlobalShortcutConfig = (
  config: Partial<TelephonyGlobalShortcutConfig> | null | undefined
): TelephonyGlobalShortcutConfig => {
  if (!config || typeof config !== 'object') {
    return defaultTelephonyGlobalShortcutConfig;
  }

  const accelerator = normalizeTelephonyShortcutAccelerator(
    config.accelerator
  );

  return {
    enabled: config.enabled === true && Boolean(accelerator),
    accelerator,
  };
};

export const telephonyPreferredServer: Reducer<
  string | null,
  TelephonyPreferredServerAction
> = (state = null, action) => {
  switch (action.type) {
    case TELEPHONY_PREFERRED_SERVER_SET:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { telephonyPreferredServer = state } = action.payload;
      return telephonyPreferredServer;
    }

    default:
      return state;
  }
};

export const telephonyGlobalShortcutConfig: Reducer<
  TelephonyGlobalShortcutConfig,
  TelephonyGlobalShortcutConfigAction
> = (state = defaultTelephonyGlobalShortcutConfig, action) => {
  switch (action.type) {
    case TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET:
      return normalizeTelephonyGlobalShortcutConfig(action.payload);

    case APP_SETTINGS_LOADED: {
      const { telephonyGlobalShortcutConfig = state } = action.payload;
      return normalizeTelephonyGlobalShortcutConfig(
        telephonyGlobalShortcutConfig
      );
    }

    default:
      return state;
  }
};

export const telephonyGlobalShortcutRegistrationStatus: Reducer<
  TelephonyGlobalShortcutRegistrationStatus,
  TelephonyGlobalShortcutRegistrationStatusAction
> = (state = defaultTelephonyGlobalShortcutRegistrationStatus, action) => {
  switch (action.type) {
    case TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED:
      return action.payload;

    default:
      return state;
  }
};
