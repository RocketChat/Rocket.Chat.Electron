import { powerMonitor } from 'electron';

import { dispatch, listen } from '../store';
import {
  SYSTEM_SUSPENDING,
  SYSTEM_LOCKING_SCREEN,
  SYSTEM_IDLE_STATE_REQUESTED,
  SYSTEM_IDLE_STATE_RESPONDED,
} from './actions';

export const setupPowerMonitor = (): void => {
  powerMonitor.addListener('suspend', () => {
    dispatch({ type: SYSTEM_SUSPENDING });
  });

  powerMonitor.addListener('lock-screen', () => {
    dispatch({ type: SYSTEM_LOCKING_SCREEN });
  });

  listen(SYSTEM_IDLE_STATE_REQUESTED, (action) => {
    dispatch({
      type: SYSTEM_IDLE_STATE_RESPONDED,
      payload: powerMonitor.getSystemIdleState(action.payload),
      meta: {
        response: true,
        id: action.meta?.id,
      },
    });
  });
};
