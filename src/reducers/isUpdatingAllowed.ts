import { Reducer } from 'redux';

import {
  UPDATES_READY,
  ActionOf,
} from '../actions';

type IsUpdatingAllowedAction = ActionOf<typeof UPDATES_READY>;

export const isUpdatingAllowed: Reducer<boolean, IsUpdatingAllowedAction> = (state = true, action) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { isUpdatingAllowed } = action.payload;
      return isUpdatingAllowed;
    }

    default:
      return state;
  }
};
