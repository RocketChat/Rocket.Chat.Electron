import path from 'path';

import { app } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import setupElectronReloader from 'electron-reloader';

export const setupDevelopmentTools = () => {
	if (process.env.NODE_ENV !== 'development') {
		return;
	}

	setupElectronReloader(require.main);

	app.whenReady().then(() => installExtension(REACT_DEVELOPER_TOOLS));

	app.setPath('userData', path.join(app.getPath('appData'), `${ app.name } (development)`));
};
