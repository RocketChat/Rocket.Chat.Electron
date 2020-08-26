import { Reducer } from 'redux';

import { UPDATES_READY, IsUpdatingAllowedActionTypes } from '../actions';

export const isUpdatingAllowed: Reducer<boolean, IsUpdatingAllowedActionTypes> = (state = true, action) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { isUpdatingAllowed } = action.payload;
      return isUpdatingAllowed;
    }

    default:
      return state;
  }
};
