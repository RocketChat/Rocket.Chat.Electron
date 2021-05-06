import { inspect } from 'util';

import { powerMonitor } from 'electron';

import { handle } from '../ipc/main';
import { dispatch } from '../store';
import { SYSTEM_SUSPENDING, SYSTEM_LOCKING_SCREEN } from './actions';

export const setupPowerMonitor = (): void => {
  powerMonitor.addListener('suspend', () => {
    dispatch({ type: SYSTEM_SUSPENDING });
  });

  powerMonitor.addListener('lock-screen', () => {
    dispatch({ type: SYSTEM_LOCKING_SCREEN });
  });

  handle(
    'power-monitor/get-system-idle-state',
    async (_webContents, idleThreshold) => {
      const state = powerMonitor.getSystemIdleState(idleThreshold);

      console.log(
        `powerMonitor.getSystemIdleState(${inspect(idleThreshold, {
          colors: true,
        })}) = ${inspect(state, { colors: true })}`
      );

      return state;
    }
  );
};
