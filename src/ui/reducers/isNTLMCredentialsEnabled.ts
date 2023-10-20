import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_NTLM_CREDENTIALS_CHANGED } from '../actions';

type isNTLMCredentialsEnabledAction =
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof SETTINGS_NTLM_CREDENTIALS_CHANGED>;

export const isNTLMCredentialsEnabled: Reducer<
  boolean,
  isNTLMCredentialsEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { isNTLMCredentialsEnabled = state } = action.payload;
      return isNTLMCredentialsEnabled;
    }

    case SETTINGS_NTLM_CREDENTIALS_CHANGED: {
      return action.payload;
    }

    default:
      return state;
  }
};
