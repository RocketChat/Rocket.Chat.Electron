import { spawn, call, take } from 'redux-saga/effects';

import { dockSaga } from './dock';
import { trayIconSaga } from './trayIcon';
import { setupI18next } from '../../i18n';
import { appReadyChannel } from '../channels';
import { rootWindowSaga } from './rootWindow';
import { menuBarSaga } from './menuBar';
import { touchBarSaga } from './touchBar';
import { appSaga } from './app';
import { deepLinksSaga } from './deepLinks';
import { navigationSaga } from './navigation';

export function *rootSaga() {
	yield take(appReadyChannel());
	yield call(setupI18next);

	const rootWindow = yield call(rootWindowSaga);

	yield spawn(appSaga, rootWindow);
	yield spawn(deepLinksSaga);
	yield spawn(navigationSaga);
	yield spawn(menuBarSaga, rootWindow);
	yield spawn(touchBarSaga, rootWindow);
	yield spawn(dockSaga);
	yield spawn(trayIconSaga);
}
