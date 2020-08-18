import { powerMonitor } from 'electron';
import { takeEvery, Effect, call } from 'redux-saga/effects';

import {
	SYSTEM_SUSPENDING,
	SYSTEM_LOCKING_SCREEN,
	SYSTEM_IDLE_STATE_REQUESTED,
} from '../../actions';
import { request } from '../../channels';

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

		const state: SystemIdleState = await request(SYSTEM_IDLE_STATE_REQUESTED, idleThreshold);

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

export function *listenToUserPresenceChanges(): Generator<Effect, void> {
	yield call(setupUserPresenceListening);

	yield takeEvery(SYSTEM_SUSPENDING, function *() {
		if (!isAutoAwayEnabled) {
			return;
		}

		goAway();
	});

	yield takeEvery(SYSTEM_LOCKING_SCREEN, function *() {
		if (!isAutoAwayEnabled) {
			return;
		}

		goAway();
	});
}
