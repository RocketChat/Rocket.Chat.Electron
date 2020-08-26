import { powerMonitor } from 'electron';

import {
  SYSTEM_SUSPENDING,
  SYSTEM_LOCKING_SCREEN,
  SYSTEM_IDLE_STATE_REQUESTED,
  SYSTEM_IDLE_STATE_RESPONDED,
} from '../../actions';
import { listen, request } from '../../store';

type SystemIdleState = ReturnType<typeof powerMonitor.getSystemIdleState>;

let isAutoAwayEnabled: boolean;
let idleThreshold: number;
let goOnline = (): void => undefined;
let goAway = (): void => undefined;

const setupUserPresenceListening = (): void => {
  const { Meteor } = window.require('meteor/meteor');
  const { Tracker } = window.require('meteor/tracker');
  const { UserPresence } = window.require('meteor/konecty:user-presence');
  const { getUserPreference } = window.require('/app/utils');

  goOnline = () => Meteor.call('UserPresence:setDefaultStatus', 'online');
  goAway = () => Meteor.call('UserPresence:setDefaultStatus', 'away');

  Tracker.autorun(() => {
    const uid = Meteor.userId();
    isAutoAwayEnabled = getUserPreference(uid, 'enableAutoAway');
    idleThreshold = getUserPreference(uid, 'idleTimeLimit');

    if (isAutoAwayEnabled) {
      delete UserPresence.awayTime;
      UserPresence.start();
    }
  });

  let prevState: SystemIdleState;
  const pollSystemIdleState = async (): Promise<void> => {
    if (!isAutoAwayEnabled || !idleThreshold) {
      return;
    }

    const state: SystemIdleState = await request<
      typeof SYSTEM_IDLE_STATE_REQUESTED,
      typeof SYSTEM_IDLE_STATE_RESPONDED
    >({
      type: SYSTEM_IDLE_STATE_REQUESTED,
      payload: idleThreshold,
    });

    if (prevState === state) {
      setTimeout(pollSystemIdleState, 1000);
      return;
    }

    const isOnline = !isAutoAwayEnabled || state === 'active' || state === 'unknown';

    if (isOnline) {
      goOnline();
    } else {
      goAway();
    }

    prevState = state;
    setTimeout(pollSystemIdleState, 1000);
  };

  pollSystemIdleState();
};

export const listenToUserPresenceChanges = (): void => {
  setupUserPresenceListening();

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
