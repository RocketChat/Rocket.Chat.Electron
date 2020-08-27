import { Certificate } from 'electron';
import { Reducer } from 'redux';

import { PERSISTABLE_VALUES_MERGED } from '../app/actions';
import { Server } from '../servers/common';
import { ActionOf } from '../store/actions';
import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
  CERTIFICATES_UPDATED,
  CERTIFICATES_CLEARED,
} from './actions';

type ClientCertificatesActionTypes = (
  ActionOf<typeof CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED>
  | ActionOf<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED>
  | ActionOf<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED>
);

export const clientCertificates: Reducer<Certificate[], ClientCertificatesActionTypes> = (state = [], action) => {
  switch (action.type) {
    case CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED:
      return action.payload;

    case SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED:
    case SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED:
      return [];

    default:
      return state;
  }
};

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
