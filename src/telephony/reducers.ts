import type { Reducer } from 'redux';

import type { ActionOf } from '../store/actions';
import { TELEPHONY_PREFERRED_SERVER_SET } from './actions';

type TelephonyPreferredServerAction = ActionOf<
  typeof TELEPHONY_PREFERRED_SERVER_SET
>;

export const telephonyPreferredServer: Reducer<
  string | null,
  TelephonyPreferredServerAction
> = (state = null, action) => {
  switch (action.type) {
    case TELEPHONY_PREFERRED_SERVER_SET:
      return action.payload;

    default:
      return state;
  }
};
