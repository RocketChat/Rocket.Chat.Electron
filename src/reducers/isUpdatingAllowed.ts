import { Reducer } from 'redux';

import {
  UPDATES_READY,
  UpdatesReadyAction,
} from '../actions';

type IsUpdatingAllowedAction = UpdatesReadyAction;

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
