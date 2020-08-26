import { Reducer } from 'redux';

import {
  APP_PATH_SET,
  ActionOf,
} from '../actions';

type AppPathAction = ActionOf<typeof APP_PATH_SET>;

export const appPath: Reducer<string | null, AppPathAction> = (state = null, action) => {
  switch (action.type) {
    case APP_PATH_SET:
      return action.payload;

    default:
      return state;
  }
};
