import { Certificate } from 'electron';
import { Reducer } from 'redux';

import {
  CERTIFICATES_UPDATED,
  CERTIFICATES_CLEARED,
  PERSISTABLE_VALUES_MERGED,
  ActionOf,
} from '../actions';
import { Server } from '../structs/servers';

type TrustedCertificatesAction = (
  ActionOf<typeof CERTIFICATES_UPDATED>
  | ActionOf<typeof CERTIFICATES_CLEARED>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
);

export const trustedCertificates: Reducer<Record<Server['url'], Certificate['fingerprint']>, TrustedCertificatesAction> = (state = {}, action) => {
  switch (action.type) {
    case CERTIFICATES_UPDATED:
      return action.payload;

    case CERTIFICATES_CLEARED:
      return {};

    case PERSISTABLE_VALUES_MERGED: {
      const { trustedCertificates = state } = action.payload;
      return trustedCertificates;
    }

    default:
      return state;
  }
};
