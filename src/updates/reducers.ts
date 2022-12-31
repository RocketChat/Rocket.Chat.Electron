import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../app/actions';
import { ActionOf } from '../store/actions';
import { ABOUT_DIALOG_TOGGLE_UPDATE_ON_START } from '../ui/actions';
import {
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_ERROR_THROWN,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  UPDATES_READY,
  UPDATE_SKIPPED,
} from './actions';

type DoCheckForUpdatesOnStartupAction =
  | ActionOf<typeof ABOUT_DIALOG_TOGGLE_UPDATE_ON_START>
  | ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const doCheckForUpdatesOnStartup: Reducer<
  boolean,
  DoCheckForUpdatesOnStartupAction
> = (state = true, action) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { doCheckForUpdatesOnStartup } = action.payload;
      return doCheckForUpdatesOnStartup;
    }

    case ABOUT_DIALOG_TOGGLE_UPDATE_ON_START: {
      const doCheckForUpdatesOnStartup = action.payload;
      return doCheckForUpdatesOnStartup;
    }

    case APP_SETTINGS_LOADED: {
      const { doCheckForUpdatesOnStartup = state } = action.payload;
      return doCheckForUpdatesOnStartup;
    }

    default:
      return state;
  }
};

type IsCheckingForUpdatesAction =
  | ActionOf<typeof UPDATES_CHECKING_FOR_UPDATE>
  | ActionOf<typeof UPDATES_ERROR_THROWN>
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>;

export const isCheckingForUpdates: Reducer<
  boolean,
  IsCheckingForUpdatesAction
> = (state = false, action) => {
  switch (action.type) {
    case UPDATES_CHECKING_FOR_UPDATE:
      return true;

    case UPDATES_ERROR_THROWN:
      return false;

    case UPDATES_NEW_VERSION_NOT_AVAILABLE:
      return false;

    case UPDATES_NEW_VERSION_AVAILABLE:
      return false;

    default:
      return state;
  }
};

type IsEachUpdatesSettingConfigurableAction =
  | ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isEachUpdatesSettingConfigurable: Reducer<
  boolean,
  IsEachUpdatesSettingConfigurableAction
> = (state = true, action) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { isEachUpdatesSettingConfigurable } = action.payload;
      return isEachUpdatesSettingConfigurable;
    }

    case APP_SETTINGS_LOADED: {
      const { isEachUpdatesSettingConfigurable = state } = action.payload;
      return isEachUpdatesSettingConfigurable;
    }

    default:
      return state;
  }
};

type IsUpdatingAllowedAction = ActionOf<typeof UPDATES_READY>;

export const isUpdatingAllowed: Reducer<boolean, IsUpdatingAllowedAction> = (
  state = true,
  action
) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { isUpdatingAllowed } = action.payload;
      return isUpdatingAllowed;
    }

    default:
      return state;
  }
};

type IsUpdatingEnabledAction =
  | ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isUpdatingEnabled: Reducer<boolean, IsUpdatingEnabledAction> = (
  state = true,
  action
) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { isUpdatingEnabled } = action.payload;
      return isUpdatingEnabled;
    }

    case APP_SETTINGS_LOADED: {
      const { isUpdatingEnabled = state } = action.payload;
      return isUpdatingEnabled;
    }

    default:
      return state;
  }
};

type NewUpdateVersionAction =
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>;

export const newUpdateVersion: Reducer<
  string | null,
  NewUpdateVersionAction
> = (state = null, action) => {
  switch (action.type) {
    case UPDATES_NEW_VERSION_AVAILABLE:
      return action.payload;

    case UPDATES_NEW_VERSION_NOT_AVAILABLE:
      return null;

    default:
      return state;
  }
};

type SkippedUpdateVersionAction =
  | ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof UPDATE_SKIPPED>;

export const skippedUpdateVersion: Reducer<
  string | null,
  SkippedUpdateVersionAction
> = (state = null, action) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { skippedUpdateVersion } = action.payload;
      return skippedUpdateVersion;
    }

    case UPDATE_SKIPPED: {
      const skippedUpdateVersion = action.payload;
      return skippedUpdateVersion;
    }

    case APP_SETTINGS_LOADED: {
      const { skippedUpdateVersion = state } = action.payload;
      return skippedUpdateVersion;
    }

    default:
      return state;
  }
};

type UpdateErrorAction =
  | ActionOf<typeof UPDATES_CHECKING_FOR_UPDATE>
  | ActionOf<typeof UPDATES_ERROR_THROWN>
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>;

export const updateError: Reducer<Error | null, UpdateErrorAction> = (
  state = null,
  action
) => {
  switch (action.type) {
    case UPDATES_CHECKING_FOR_UPDATE:
      return null;

    case UPDATES_ERROR_THROWN:
      return action.payload;

    case UPDATES_NEW_VERSION_NOT_AVAILABLE:
      return null;

    case UPDATES_NEW_VERSION_AVAILABLE:
      return null;

    default:
      return state;
  }
};
