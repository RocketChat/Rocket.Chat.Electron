import { Reducer } from 'redux';

import {
  APP_VERSION_SET,
  AppVersionSetAction,
} from '../actions';

type AppVersionAction = AppVersionSetAction;

export const appVersion: Reducer<string | null, AppVersionAction> = (state = null, action) => {
  switch (action.type) {
    case APP_VERSION_SET:
      return action.payload;

    default:
      return state;
  }
};
