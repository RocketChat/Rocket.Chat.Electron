import { Reducer } from 'redux';

import {
  APP_VERSION_SET,
  ActionOf,
} from '../actions';

type AppVersionAction = ActionOf<typeof APP_VERSION_SET>;

export const appVersion: Reducer<string | null, AppVersionAction> = (state = null, action) => {
  switch (action.type) {
    case APP_VERSION_SET:
      return action.payload;

    default:
      return state;
  }
};
