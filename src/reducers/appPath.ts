import { Reducer } from 'redux';

import {
  APP_PATH_SET,
  AppPathActionTypes,
} from '../actions';

export const appPath: Reducer<string | null, AppPathActionTypes> = (state = null, action) => {
  switch (action.type) {
    case APP_PATH_SET:
      return action.payload;

    default:
      return state;
  }
};
