import { Reducer } from 'redux';

import {
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_ERROR_THROWN,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  ActionOf,
} from '../actions';

type UpdateErrorAction = (
  ActionOf<typeof UPDATES_CHECKING_FOR_UPDATE>
  | ActionOf<typeof UPDATES_ERROR_THROWN>
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>
);

export const updateError: Reducer<Error | null, UpdateErrorAction> = (state = null, action) => {
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
