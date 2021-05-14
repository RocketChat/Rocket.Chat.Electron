import {
  SYSTEM_SUSPENDING,
  SYSTEM_LOCKING_SCREEN,
} from '../common/actions/userPresenceActions';
import { listen } from '../common/store';
import type { RootAction } from '../common/types/RootAction';
import type { SystemIdleState } from '../common/types/SystemIdleState';
import { invoke } from '../ipc/renderer';

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
