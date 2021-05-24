import { createAction } from '@reduxjs/toolkit';
import type { Certificate } from 'electron';

export const requestQueued = createAction(
  'certificate/requestQueued',
  (id: unknown, url: string, error: string, certificate: Certificate) => ({
    payload: {
      id,
      url,
      error,
      certificate,
    },
  })
);

export const trusted = createAction(
  'certificate/trusted',
  (host: string, serializedCertificate: string) => ({
    payload: {
      host,
      serializedCertificate,
    },
  })
);
