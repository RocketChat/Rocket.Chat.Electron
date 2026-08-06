import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../app/actions';
import type { ActionOf } from '../store/actions';
import {
  ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
  ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
} from '../ui/actions';
import {
  UPDATES_CHECK_FEEDBACK_DISMISSED,
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_DOWNLOAD_PROGRESSED,
  UPDATES_DOWNLOAD_REQUESTED,
  UPDATES_ERROR_THROWN,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  UPDATES_PANEL_TOGGLED,
  UPDATES_READY,
  UPDATES_SKIP_REQUESTED,
  UPDATES_UPDATE_DOWNLOADED,
  UPDATE_SKIPPED,
  UPDATES_CHANNEL_CHANGED,
} from './actions';
import type { UpdateCheckStatus, UpdateDownloadStatus } from './common';

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
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>
  | ActionOf<typeof UPDATE_SKIPPED>;

export const newUpdateVersion: Reducer<
  string | null,
  NewUpdateVersionAction
> = (state = null, action) => {
  switch (action.type) {
    case UPDATES_NEW_VERSION_AVAILABLE: {
      const newUpdateVersion = action.payload;
      return newUpdateVersion;
    }

    case UPDATES_NEW_VERSION_NOT_AVAILABLE:
    case UPDATE_SKIPPED: {
      return null;
    }

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

type UpdateDownloadAction =
  | ActionOf<typeof UPDATES_DOWNLOAD_REQUESTED>
  | ActionOf<typeof UPDATES_DOWNLOAD_PROGRESSED>
  | ActionOf<typeof UPDATES_UPDATE_DOWNLOADED>
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>
  | ActionOf<typeof UPDATES_ERROR_THROWN>
  | ActionOf<typeof UPDATE_SKIPPED>;

export const updateDownloadStatus: Reducer<
  UpdateDownloadStatus,
  UpdateDownloadAction
> = (state = 'idle', action) => {
  switch (action.type) {
    case UPDATES_DOWNLOAD_REQUESTED:
    case UPDATES_DOWNLOAD_PROGRESSED:
      return 'downloading';

    case UPDATES_UPDATE_DOWNLOADED:
      return 'downloaded';

    // A new version, a dismissed one, or a failed download all send the label
    // back to its "available" resting state.
    case UPDATES_NEW_VERSION_AVAILABLE:
    case UPDATES_NEW_VERSION_NOT_AVAILABLE:
    case UPDATES_ERROR_THROWN:
    case UPDATE_SKIPPED:
      return 'idle';

    default:
      return state;
  }
};

export const updateDownloadProgress: Reducer<number, UpdateDownloadAction> = (
  state = 0,
  action
) => {
  switch (action.type) {
    case UPDATES_DOWNLOAD_PROGRESSED:
      return action.payload;

    case UPDATES_UPDATE_DOWNLOADED:
      return 100;

    case UPDATES_DOWNLOAD_REQUESTED:
    case UPDATES_NEW_VERSION_AVAILABLE:
    case UPDATES_NEW_VERSION_NOT_AVAILABLE:
    case UPDATES_ERROR_THROWN:
    case UPDATE_SKIPPED:
      return 0;

    default:
      return state;
  }
};

type UpdateCheckStatusAction =
  | ActionOf<typeof UPDATES_CHECK_FEEDBACK_DISMISSED>
  | ActionOf<typeof UPDATES_CHECK_FOR_UPDATES_REQUESTED>
  | ActionOf<typeof UPDATES_ERROR_THROWN>
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>;

/**
 * Feedback for user-initiated update checks (menu bar / meatball menu / About
 * dialog), surfaced by the titlebar update label. Keyed on the requested
 * action rather than the autoUpdater's `checking-for-update` event so startup
 * auto-checks stay at `idle` and never flash the titlebar; the outcome
 * transitions only apply while a user-initiated check is in flight for the
 * same reason.
 */
export const updateCheckStatus: Reducer<
  UpdateCheckStatus,
  UpdateCheckStatusAction
> = (state = 'idle', action) => {
  switch (action.type) {
    case UPDATES_CHECK_FOR_UPDATES_REQUESTED:
      return 'checking';

    case UPDATES_NEW_VERSION_NOT_AVAILABLE:
      return state === 'checking' ? 'upToDate' : state;

    case UPDATES_ERROR_THROWN:
      return state === 'checking' ? 'failed' : state;

    // The available-update pill takes over the titlebar.
    case UPDATES_NEW_VERSION_AVAILABLE:
      return 'idle';

    case UPDATES_CHECK_FEEDBACK_DISMISSED:
      return 'idle';

    default:
      return state;
  }
};

type IsUpdatePanelOpenAction =
  | ActionOf<typeof UPDATES_PANEL_TOGGLED>
  | ActionOf<typeof UPDATES_DOWNLOAD_REQUESTED>
  | ActionOf<typeof UPDATES_SKIP_REQUESTED>
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>
  | ActionOf<typeof UPDATES_ERROR_THROWN>
  | ActionOf<typeof UPDATE_SKIPPED>;

export const isUpdatePanelOpen: Reducer<boolean, IsUpdatePanelOpenAction> = (
  state = false,
  action
) => {
  switch (action.type) {
    case UPDATES_PANEL_TOGGLED:
      return action.payload;

    // Acting on the panel, or the update going away, dismisses it.
    case UPDATES_DOWNLOAD_REQUESTED:
    case UPDATES_SKIP_REQUESTED:
    case UPDATES_NEW_VERSION_NOT_AVAILABLE:
    case UPDATES_ERROR_THROWN:
    case UPDATE_SKIPPED:
      return false;

    default:
      return state;
  }
};

type UpdateChannelAction =
  | ActionOf<typeof ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED>
  | ActionOf<typeof UPDATES_CHANNEL_CHANGED>
  | ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const updateChannel: Reducer<string, UpdateChannelAction> = (
  state = 'latest',
  action
) => {
  switch (action.type) {
    case ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED:
    case UPDATES_CHANNEL_CHANGED: {
      return action.payload;
    }

    case UPDATES_READY: {
      const { updateChannel } = action.payload;
      return updateChannel;
    }

    case APP_SETTINGS_LOADED: {
      const { updateChannel = state } = action.payload;
      return updateChannel;
    }

    default:
      return state;
  }
};
