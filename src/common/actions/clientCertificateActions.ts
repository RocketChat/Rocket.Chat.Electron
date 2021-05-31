import { createAction } from '@reduxjs/toolkit';
import type { Certificate } from 'electron';

export const requestQueued = createAction(
  'clientCertificate/requestQueued',
  (id: unknown, certificates: Certificate[]) => ({
    payload: {
      id,
      certificates,
    },
  })
);

export const requested = createAction(
  'clientCertificate/requested',
  (certificates: Certificate[]) => ({
    payload: {
      certificates,
    },
  })
);

export const selected = createAction(
  'clientCertificate/selected',
  (fingerprint: Certificate['fingerprint']) => ({
    payload: {
      fingerprint,
    },
  })
);

export const dismissed = createAction('clientCertificate/dismissed');
