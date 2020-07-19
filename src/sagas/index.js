import { fork } from 'redux-saga/effects';

import { navigationEventsSaga } from './navigationEvents';
import { preferencesSaga } from './preferences';
import { serversSaga } from './servers';
import { spellCheckingSaga } from './spellChecking';
import { updatesSaga } from './updates';

export function *rootSaga() {
	yield fork(navigationEventsSaga);
	yield fork(preferencesSaga);
	yield fork(serversSaga);
	yield fork(spellCheckingSaga);
	yield fork(updatesSaga);
}
