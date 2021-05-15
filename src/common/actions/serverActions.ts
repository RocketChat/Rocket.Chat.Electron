import { createAction } from '@reduxjs/toolkit';

import type { Server } from '../types/Server';
import type { SystemIdleState } from '../types/SystemIdleState';

export const presenceParamsSet = createAction(
  'server/presenceParamsSet',
  (
    url: Server['url'],
    presence:
      | {
          autoAwayEnabled: false;
        }
      | {
          autoAwayEnabled: true;
          idleThreshold: number | null;
        }
  ) => ({
    payload: {
      url,
      presence,
    },
  })
);

export const idleStateChanged = createAction(
  'server/idleStateChanged',
  (url: Server['url'], idleState: SystemIdleState) => ({
    payload: {
      url,
      idleState,
    },
  })
);
