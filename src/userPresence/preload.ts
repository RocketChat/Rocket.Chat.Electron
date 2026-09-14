import { invoke } from '../ipc/renderer';
import { listen } from '../store';
import type { RootAction } from '../store/actions';
import { SYSTEM_SUSPENDING, SYSTEM_LOCKING_SCREEN } from './actions';
import type { SystemIdleState } from './common';

let detachCallbacks: () => void;
let reassert: () => void = () => undefined;

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
  let prevState: SystemIdleState | undefined;

  const reportSystemIdleState = async (force: boolean): Promise<void> => {
    if (!isAutoAwayEnabled || !idleThreshold) {
      return;
    }

    const state = await invoke(
      'power-monitor/get-system-idle-state',
      idleThreshold
    );

    if (!force && prevState === state) {
      return;
    }

    prevState = state;
    setUserOnline(state === 'active' || state === 'unknown');
  };

  const pollSystemIdleState = async (): Promise<void> => {
    if (!isAutoAwayEnabled || !idleThreshold) {
      return;
    }

    pollingTimer = setTimeout(pollSystemIdleState, 2000);

    await reportSystemIdleState(false);
  };

  pollSystemIdleState();

  // After a websocket reconnection the server writes `online` for the new
  // session. The poller only reports OS idle transitions, so a user who
  // stayed idle across the drop would remain `online` until the next
  // transition. This lets the page ask for an unconditional report once the
  // connection and login have settled.
  reassert = (): void => {
    void reportSystemIdleState(true);
  };

  return (): void => {
    unsubscribeFromPowerMonitorEvents();
    clearTimeout(pollingTimer);
    reassert = () => undefined;
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

export const reassertUserPresenceDetection = (): void => {
  reassert();
};
