import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import { APP_VERSION_SET } from '../actions/appActions';

type AppVersionAction = ActionOf<typeof APP_VERSION_SET>;

export const appVersion: Reducer<string | null, AppVersionAction> = (
  state = null,
  action
) => {
  switch (action.type) {
    case APP_VERSION_SET:
      return action.payload;

    default:
      return state;
  }
};
