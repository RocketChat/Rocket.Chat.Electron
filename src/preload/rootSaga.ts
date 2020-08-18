import { Effect, call } from 'redux-saga/effects';

import { takeRequests } from '../channels';
import { whenReady } from '../whenReady';
import { attachEditFlagsHandling } from './editFlags';
import { attachErrorHandling } from './errors';
import { isJitsi, setupJitsiPage } from './jitsi';
import { isRocketChat, setupRocketChatPage } from './rocketChat';
import { attachSpellChecking } from './spellChecking';

export function *rootSaga(): Generator<Effect, void> {
	yield *takeRequests();

	yield call(whenReady);

	yield *attachErrorHandling();
	yield *attachEditFlagsHandling();
	yield *attachSpellChecking();

	if (yield call(isRocketChat)) {
		yield *setupRocketChatPage();
	}

	if (yield call(isJitsi)) {
		yield *setupJitsiPage();
	}
}
