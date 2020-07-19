import { spawn, call, take } from 'redux-saga/effects';

import { dockSaga } from './dock';
import { trayIconSaga } from './trayIcon';
import { setupI18next } from '../../i18n';
import { appReadyChannel } from '../channels';
import { rootWindowSaga } from './rootWindow';
import { menuBarSaga } from './menuBar';
import { touchBarSaga } from './touchBar';

export function *rootSaga() {
	yield take(appReadyChannel());
	yield call(setupI18next);

	yield spawn(dockSaga);
	yield spawn(trayIconSaga);

	const rootWindow = yield call(rootWindowSaga);

	yield spawn(menuBarSaga, rootWindow);
	yield spawn(touchBarSaga, rootWindow);
}
