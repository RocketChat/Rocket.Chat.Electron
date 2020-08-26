import { Reducer } from 'redux';

import {
  APP_PATH_SET, AppPathSetAction,
} from '../actions';

type AppPathAction = AppPathSetAction;

export const appPath: Reducer<string | null, AppPathAction> = (state = null, action) => {
  switch (action.type) {
    case APP_PATH_SET:
      return action.payload;

    default:
      return state;
  }
};
