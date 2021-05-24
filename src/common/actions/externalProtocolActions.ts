import { createAction } from '@reduxjs/toolkit';

export const allowed = createAction(
  'externalProtocol/allowed',
  (protocol: string) => ({
    payload: {
      protocol,
    },
  })
);

export const denied = createAction(
  'externalProtocol/denied',
  (protocol: string) => ({
    payload: {
      protocol,
    },
  })
);
