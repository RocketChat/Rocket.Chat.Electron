import { Menu } from 'electron';
import { takeEvery, spawn } from 'redux-saga/effects';

import { runSaga } from '../reduxStore';
import { selectMenuTemplate } from './selectors';
import { storeChangeChannel } from '../channels';

function *watchIsMenuBarEnabled(rootWindow) {
	if (process.platform !== 'darwin') {
		const isMenuBarEnabledAction = storeChangeChannel((state) => state.isMenuBarEnabled);

		yield takeEvery(isMenuBarEnabledAction, function *([isMenuBarEnabled]) {
			rootWindow.autoHideMenuBar = !isMenuBarEnabled;
			rootWindow.setMenuBarVisibility(isMenuBarEnabled);
		});
	}
}

function *watchMenuTemplate(rootWindow) {
	const menuTemplateAction = storeChangeChannel(selectMenuTemplate);

	yield takeEvery(menuTemplateAction, function *([menuTemplate]) {
		const menu = Menu.buildFromTemplate(menuTemplate);

		if (process.platform === 'darwin') {
			Menu.setApplicationMenu(menu);
			return;
		}

		Menu.setApplicationMenu(null);
		rootWindow.setMenu(menu);
	});
}

function *menuBarSaga(rootWindow) {
	yield spawn(watchIsMenuBarEnabled, rootWindow);
	yield spawn(watchMenuTemplate, rootWindow);
}

export const setupMenuBar = (rootWindow) => {
	runSaga(menuBarSaga, rootWindow);
};
