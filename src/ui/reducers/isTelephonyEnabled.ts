import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED } from '../actions';

type IsTelephonyEnabledAction =
  | ActionOf<typeof SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isTelephonyEnabled: Reducer<boolean, IsTelephonyEnabledAction> = (
  state = false,
  action
) => {
  switch (action.type) {
    case SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isTelephonyEnabled = state } = action.payload;
      return isTelephonyEnabled;
    }

    default:
      return state;
  }
};
