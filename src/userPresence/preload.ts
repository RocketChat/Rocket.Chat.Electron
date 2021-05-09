import { invoke } from '../ipc/renderer';
import { listen } from '../store';
import { RootAction } from '../store/actions';
import { SYSTEM_SUSPENDING, SYSTEM_LOCKING_SCREEN } from './actions';
import { SystemIdleState } from './common';

let detachCallbacks: () => void;

const attachCallbacks = ({
  isAutoAwayEnabled,
  idleThreshold,
  setUserOnline,
}: {
  isAutoAwayEnabled: boolean;
  idleThreshold: number | null;
  setUserOnline: (online: boolean) => void;
}): (() => void) => {
  const unsubscribeFromPowerMonitorEvents = listen(
    (action): action is RootAction =>
      [SYSTEM_SUSPENDING, SYSTEM_LOCKING_SCREEN].includes(action.type),
    () => {
      if (!isAutoAwayEnabled) {
        return;
      }

      setUserOnline(false);
    }
  );

  let pollingTimer: ReturnType<typeof setTimeout>;
  let prevState: SystemIdleState;
  const pollSystemIdleState = async (): Promise<void> => {
    if (!isAutoAwayEnabled || !idleThreshold) {
      return;
    }

    pollingTimer = setTimeout(pollSystemIdleState, 2000);

    const state = await invoke(
      'power-monitor/get-system-idle-state',
      idleThreshold
    );

    if (prevState === state) {
      return;
    }

    const isOnline = state === 'active' || state === 'unknown';
    setUserOnline(isOnline);

    prevState = state;
  };

  pollSystemIdleState();

  return (): void => {
    unsubscribeFromPowerMonitorEvents();
    clearTimeout(pollingTimer);
  };
};

export const setUserPresenceDetection = (options: {
  isAutoAwayEnabled: boolean;
  idleThreshold: number | null;
  setUserOnline: (online: boolean) => void;
}): void => {
  detachCallbacks?.();
  detachCallbacks = attachCallbacks(options);
};
