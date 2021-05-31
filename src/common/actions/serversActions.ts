import { createAction } from '@reduxjs/toolkit';
import type { AuthenticationResponseDetails } from 'electron';

import type { Server } from '../types/Server';

export const sorted = createAction(
  'servers/sorted',
  (urls: Server['url'][]) => ({
    payload: {
      urls,
    },
  })
);

export const loginRequested = createAction(
  'servers/loginRequested',
  (
    id: unknown,
    authenticationResponseDetails: AuthenticationResponseDetails
  ) => ({
    payload: {
      id,
      authenticationResponseDetails,
    },
  })
);
