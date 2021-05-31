import { createReducer } from '@reduxjs/toolkit';
import type { Certificate } from 'electron';

import * as certificateActions from '../actions/certificateActions';
import * as certificatesActions from '../actions/certificatesActions';
import * as clientCertificateActions from '../actions/clientCertificateActions';
import * as externalProtocolActions from '../actions/externalProtocolActions';

type State = {
  clientCertificateRequest:
    | undefined
    | {
        certificates: Certificate[];
      };
  trustedCertificates: Record<string, string>;
  externalProtocols: Record<string, boolean>;
};

export const navigationReducer = createReducer<State>(
  {
    clientCertificateRequest: undefined,
    trustedCertificates: {},
    externalProtocols: {},
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
      .addCase(certificateActions.trusted, (state, action) => {
        const { host, serializedCertificate } = action.payload;
        state[host] = serializedCertificate;
      })
      .addCase(certificatesActions.cleared, (state) => {
        state.trustedCertificates = {};
      })
      .addCase(externalProtocolActions.allowed, (state, action) => {
        const { protocol } = action.payload;
        state.externalProtocols[protocol] = true;
      })
      .addCase(externalProtocolActions.denied, (state, action) => {
        const { protocol } = action.payload;
        state.externalProtocols[protocol] = false;
      })
);
