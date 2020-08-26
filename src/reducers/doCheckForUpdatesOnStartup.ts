import { Reducer } from 'redux';

import {
  ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  ActionOf,
} from '../actions';

type DoCheckForUpdatesOnStartupAction = (
  ActionOf<typeof ABOUT_DIALOG_TOGGLE_UPDATE_ON_START>
  | ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
);

export const doCheckForUpdatesOnStartup: Reducer<boolean, DoCheckForUpdatesOnStartupAction> = (state = true, action) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { doCheckForUpdatesOnStartup } = action.payload;
      return doCheckForUpdatesOnStartup;
    }

    case ABOUT_DIALOG_TOGGLE_UPDATE_ON_START: {
      const doCheckForUpdatesOnStartup = action.payload;
      return doCheckForUpdatesOnStartup;
    }

    case PERSISTABLE_VALUES_MERGED: {
      const { doCheckForUpdatesOnStartup = state } = action.payload;
      return doCheckForUpdatesOnStartup;
    }

    default:
      return state;
  }
};
