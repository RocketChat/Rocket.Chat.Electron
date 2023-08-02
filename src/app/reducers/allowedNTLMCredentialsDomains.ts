import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import {
  APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
  APP_SETTINGS_LOADED,
} from '../actions';

type allowedNTLMCredentialsDomainsAction =
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET>;

export const allowedNTLMCredentialsDomains: Reducer<
  string | null,
  allowedNTLMCredentialsDomainsAction
> = (state = null, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { allowedNTLMCredentialsDomains = state } = action.payload;
      return allowedNTLMCredentialsDomains;
    }

    case APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET: {
      if (action.payload === null) return null;
      return action.payload;
    }

    default:
      return state;
  }
};
