import { Certificate } from 'electron';
import { Reducer } from 'redux';

import {
  CERTIFICATES_UPDATED,
  CERTIFICATES_CLEARED,
  PERSISTABLE_VALUES_MERGED,
  CertificatesUpdatedAction,
  CertificatesClearedAction,
  PersistableValuesMergedAction,
} from '../actions';
import { Server } from '../structs/servers';

type TrustedCertificatesAction = (
  CertificatesUpdatedAction
  | CertificatesClearedAction
  | PersistableValuesMergedAction
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
