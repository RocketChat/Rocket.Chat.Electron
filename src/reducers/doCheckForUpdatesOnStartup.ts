import { Reducer } from 'redux';

import {
  ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  AboutDialogToggleUpdateOnStartAction,
  UpdatesReadyAction,
  PersistableValuesMergedAction,
} from '../actions';

type DoCheckForUpdatesOnStartupAction = (
  AboutDialogToggleUpdateOnStartAction
  | UpdatesReadyAction
  | PersistableValuesMergedAction
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
