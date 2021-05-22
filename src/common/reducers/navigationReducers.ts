import type { Certificate } from 'electron';
import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import {
  CERTIFICATES_UPDATED,
  CERTIFICATES_CLEARED,
  EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
} from '../actions/navigationActions';
import type { Server } from '../types/Server';

type TrustedCertificatesAction =
  | ActionOf<typeof CERTIFICATES_UPDATED>
  | ActionOf<typeof CERTIFICATES_CLEARED>;

export const trustedCertificates: Reducer<
  Record<Server['url'], Certificate['fingerprint']>,
  TrustedCertificatesAction
> = (state = {}, action) => {
  switch (action.type) {
    case CERTIFICATES_UPDATED:
      return action.payload;

    case CERTIFICATES_CLEARED:
      return {};

    default:
      return state;
  }
};

type ExternalProtocolsAction = ActionOf<
  typeof EXTERNAL_PROTOCOL_PERMISSION_UPDATED
>;

export const externalProtocols: Reducer<
  Record<string, boolean>,
  ExternalProtocolsAction
> = (state = {}, action) => {
  switch (action.type) {
    case EXTERNAL_PROTOCOL_PERMISSION_UPDATED: {
      state = {
        ...state,
        [action.payload.protocol]: action.payload.allowed,
      };
      return state;
    }

    default:
      return state;
  }
};
