import type { Reducer } from 'redux';

import type { ScreenLockPasswordStored } from '../../app/PersistableValues';
import { APP_SETTINGS_LOADED } from '../../app/actions';
import { SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED } from '../actions';

export const screenLockPasswordHash: Reducer<
  ScreenLockPasswordStored | null,
  any
> = (state = null, action) => {
  switch (action.type) {
    case SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { screenLockPasswordHash = state } = action.payload;
      return screenLockPasswordHash;
    }

    default:
      return state;
  }
};
