import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import { ABOUT_DIALOG_TOGGLE_UPDATE_ON_START } from '../actions/uiActions';
import {
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_ERROR_THROWN,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  UPDATE_SKIPPED,
} from '../actions/updatesActions';

type DoCheckForUpdatesOnStartupAction = ActionOf<
  typeof ABOUT_DIALOG_TOGGLE_UPDATE_ON_START
>;

export const doCheckForUpdatesOnStartup: Reducer<
  boolean,
  DoCheckForUpdatesOnStartupAction
> = (state = true, action) => {
  switch (action.type) {
    case ABOUT_DIALOG_TOGGLE_UPDATE_ON_START: {
      const doCheckForUpdatesOnStartup = action.payload;
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

export const isEachUpdatesSettingConfigurable: Reducer<boolean, any> = (
  state = true
) => state;

export const isUpdatingAllowed: Reducer<boolean, any> = (state = true) => state;

export const isUpdatingEnabled: Reducer<boolean, any> = (state = true) => state;

type NewUpdateVersionAction =
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>;

export const newUpdateVersion: Reducer<string | null, NewUpdateVersionAction> =
  (state = null, action) => {
    switch (action.type) {
      case UPDATES_NEW_VERSION_AVAILABLE:
        return action.payload;

      case UPDATES_NEW_VERSION_NOT_AVAILABLE:
        return null;

      default:
        return state;
    }
  };

type SkippedUpdateVersionAction = ActionOf<typeof UPDATE_SKIPPED>;

export const skippedUpdateVersion: Reducer<
  string | null,
  SkippedUpdateVersionAction
> = (state = null, action) => {
  switch (action.type) {
    case UPDATE_SKIPPED: {
      const skippedUpdateVersion = action.payload;
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
