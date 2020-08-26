import { Reducer } from 'redux';

import {
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  IsUpdatingEnabledActionTypes,
} from '../actions';

export const isUpdatingEnabled: Reducer<boolean, IsUpdatingEnabledActionTypes> = (state = true, action) => {
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
