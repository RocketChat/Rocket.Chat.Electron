import { invoke } from '../ipc/renderer';
import { listen } from '../store';
import { SYSTEM_SUSPENDING, SYSTEM_LOCKING_SCREEN } from './actions';
import { SystemIdleState } from './common';

let isAutoAwayEnabled: boolean;
let idleThreshold: number | null;
let goOnline = (): void => undefined;
let goAway = (): void => undefined;

let prevInterval: NodeJS.Timeout;
const setupUserPresenceListening = (): void => {
  let prevState: SystemIdleState;
  const pollSystemIdleState = async (): Promise<void> => {
    if (!isAutoAwayEnabled || !idleThreshold) {
      return;
    }

    const state = await invoke(
      'power-monitor/get-system-idle-state',
      idleThreshold
    );

    if (prevState === state) {
      return;
    }

    const isOnline =
      !isAutoAwayEnabled || state === 'active' || state === 'unknown';

    if (isOnline) {
      goOnline();
    } else {
      goAway();
    }

    prevState = state;
  };
  if (prevInterval) {
    clearInterval(prevInterval);
  }

  prevInterval = setInterval(pollSystemIdleState, 2000);
};

export const listenToUserPresenceChanges = (): void => {
  listen(SYSTEM_SUSPENDING, () => {
    if (!isAutoAwayEnabled) {
      return;
    }

    goAway();
  });

  listen(SYSTEM_LOCKING_SCREEN, () => {
    if (!isAutoAwayEnabled) {
      return;
    }

    goAway();
  });
};

export const setUserPresenceDetection = (options: {
  isAutoAwayEnabled: boolean;
  idleThreshold: number | null;
  setUserOnline: (online: boolean) => void;
}): void => {
  isAutoAwayEnabled = options.isAutoAwayEnabled;
  idleThreshold = options.idleThreshold;
  goOnline = () => options.setUserOnline(true);
  goAway = () => options.setUserOnline(false);
  setupUserPresenceListening();
};
