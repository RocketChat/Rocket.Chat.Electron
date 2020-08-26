import { Reducer } from 'redux';

import {
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  ActionOf,
} from '../actions';

type IsUpdatingEnabledAction = (
  ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
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
