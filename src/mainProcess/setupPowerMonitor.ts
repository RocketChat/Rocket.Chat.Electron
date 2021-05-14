import { powerMonitor } from 'electron';

import {
  SYSTEM_SUSPENDING,
  SYSTEM_LOCKING_SCREEN,
} from '../common/actions/userPresenceActions';
import { handle } from '../ipc/main';
import { dispatch } from '../store';

export const setupPowerMonitor = (): void => {
  powerMonitor.addListener('suspend', () => {
    dispatch({ type: SYSTEM_SUSPENDING });
  });

  powerMonitor.addListener('lock-screen', () => {
    dispatch({ type: SYSTEM_LOCKING_SCREEN });
  });

  handle(
    'power-monitor/get-system-idle-state',
    async (_webContents, idleThreshold) =>
      powerMonitor.getSystemIdleState(idleThreshold)
  );
};
