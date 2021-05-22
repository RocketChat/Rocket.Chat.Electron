import { createReducer } from '@reduxjs/toolkit';
import type { Certificate } from 'electron';

import * as clientCertificateActions from '../actions/clientCertificateActions';

type State = {
  clientCertificateRequest:
    | undefined
    | {
        certificates: Certificate[];
      };
};

export const navigationReducer = createReducer<State>(
  {
    clientCertificateRequest: undefined,
  },
  (builder) =>
    builder
      .addCase(clientCertificateActions.requested, (state, action) => {
        const { certificates } = action.payload;
        state.clientCertificateRequest = {
          certificates,
        };
      })
      .addCase(clientCertificateActions.selected, (state) => {
        state.clientCertificateRequest = undefined;
      })
      .addCase(clientCertificateActions.dismissed, (state) => {
        state.clientCertificateRequest = undefined;
      })
);
