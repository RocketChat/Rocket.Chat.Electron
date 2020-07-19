import { Menu } from 'electron';

import { watch } from '../../sagaUtils';
import { runSaga } from '../reduxStore';
import { selectIsMenuBarEnabled, selectMenuTemplate } from './selectors';

function *menuBarSaga(rootWindow) {
	if (process.platform !== 'darwin') {
		yield watch(selectIsMenuBarEnabled, function *(isMenuBarEnabled) {
			rootWindow.autoHideMenuBar = !isMenuBarEnabled;
			rootWindow.setMenuBarVisibility(isMenuBarEnabled);
		});
	}

	yield watch(selectMenuTemplate, function *(menuTemplate) {
		const menu = Menu.buildFromTemplate(menuTemplate);

		if (process.platform === 'darwin') {
			Menu.setApplicationMenu(menu);
			return;
		}

		Menu.setApplicationMenu(null);
		rootWindow.setMenu(menu);
	});
}

export const setupMenuBar = (rootWindow) => {
	runSaga(menuBarSaga, rootWindow);
};
