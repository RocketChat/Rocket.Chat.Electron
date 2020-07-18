import { Menu } from 'electron';
import { fork, select, call, take } from 'redux-saga/effects';

import { runSaga } from '../reduxStore';
import { selectIsMenuBarEnabled, selectMenuTemplate } from './selectors';

const toggleMenuBar = (rootWindow, isEnabled) => {
	if (process.platform === 'darwin') {
		return;
	}

	rootWindow.autoHideMenuBar = !isEnabled;
	rootWindow.setMenuBarVisibility(isEnabled);
};

const updateMenuBar = (rootWindow, menuTemplate) => {
	const menu = Menu.buildFromTemplate(menuTemplate);

	if (process.platform === 'darwin') {
		Menu.setApplicationMenu(menu);
		return;
	}

	Menu.setApplicationMenu(null);
	rootWindow.setMenu(menu);
};

function *watchIsMenuBarEnabled(rootWindow) {
	if (process.platform === 'darwin') {
		return;
	}

	let prevIsMenuBarEnabled;
	do {
		const isMenuBarEnabled = yield select(selectIsMenuBarEnabled);

		if (isMenuBarEnabled !== prevIsMenuBarEnabled) {
			toggleMenuBar(rootWindow, isMenuBarEnabled);
			prevIsMenuBarEnabled = isMenuBarEnabled;
		}

		yield take();
	} while (true);
}

function *watchMenuTemplate(rootWindow) {
	let prevMenuTemplate;
	do {
		const menuTemplate = yield select(selectMenuTemplate);

		if (menuTemplate !== prevMenuTemplate) {
			yield call(updateMenuBar, rootWindow, menuTemplate);
			prevMenuTemplate = menuTemplate;
		}

		yield take();
	} while (true);
}

function *menuBarSaga(rootWindow) {
	yield fork(watchIsMenuBarEnabled, rootWindow);
	yield fork(watchMenuTemplate, rootWindow);
}

export const setupMenuBar = (rootWindow) => {
	runSaga(menuBarSaga, rootWindow);
};
