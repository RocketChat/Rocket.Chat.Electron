import path from 'path';

import { app } from 'electron';
// import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import setupElectronReload from 'electron-reload';

export const setupDevelopmentTools = () => {
	if (process.env.NODE_ENV !== 'development') {
		return;
	}

	setupElectronReload(path.join(app.getAppPath(), 'app'), {
		electron: process.execPath,
	});

	// Waiting for https://github.com/MarshallOfSound/electron-devtools-installer/pull/140 to be merged
	// app.whenReady().then(() => installExtension(REACT_DEVELOPER_TOOLS));

	app.setPath('userData', path.join(app.getPath('appData'), `${ app.name } (development)`));
};
