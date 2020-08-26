import { Reducer } from 'redux';

import {
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_ERROR_THROWN,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  ActionOf,
} from '../actions';

type IsCheckingForUpdatesAction = (
  ActionOf<typeof UPDATES_CHECKING_FOR_UPDATE>
  | ActionOf<typeof UPDATES_ERROR_THROWN>
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>
);

export const isCheckingForUpdates: Reducer<boolean, IsCheckingForUpdatesAction> = (state = false, action) => {
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
