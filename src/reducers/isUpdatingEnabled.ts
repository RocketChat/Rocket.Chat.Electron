import { Reducer } from 'redux';

import {
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  UpdatesReadyAction,
  PersistableValuesMergedAction,
} from '../actions';

type IsUpdatingEnabledAction = (
  UpdatesReadyAction
  | PersistableValuesMergedAction
);

export const isUpdatingEnabled: Reducer<boolean, IsUpdatingEnabledAction> = (state = true, action) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { isUpdatingEnabled } = action.payload;
      return isUpdatingEnabled;
    }

    case PERSISTABLE_VALUES_MERGED: {
      const { isUpdatingEnabled = state } = action.payload;
      return isUpdatingEnabled;
    }

    default:
      return state;
  }
};
