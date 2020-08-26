import { Reducer } from 'redux';

import {
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  UpdatesNewVersionAvailableAction,
  UpdatesNewVersionNotAvailableAction,
} from '../actions';

type NewUpdateVersionAction = (
  UpdatesNewVersionAvailableAction
  | UpdatesNewVersionNotAvailableAction
)

export const newUpdateVersion: Reducer<string | null, NewUpdateVersionAction> = (state = null, action) => {
  switch (action.type) {
    case UPDATES_NEW_VERSION_AVAILABLE:
      return action.payload;

    case UPDATES_NEW_VERSION_NOT_AVAILABLE:
      return null;

    default:
      return state;
  }
};
