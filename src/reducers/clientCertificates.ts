import { Certificate } from 'electron';
import { Reducer } from 'redux';

import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  ActionOf,
} from '../actions';

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
