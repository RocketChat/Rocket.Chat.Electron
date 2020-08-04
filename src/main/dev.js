import path from 'path';

import { app } from 'electron';

const setupElectronReloader = async () => {
	await app.whenReady();
	const { default: setupElectronReloader } = await import('electron-reloader');
	setupElectronReloader(require.main);
};

const installDevTools = async () => {
	await app.whenReady();
	const {
		default: installExtension,
		REACT_DEVELOPER_TOOLS,
		REDUX_DEVTOOLS,
	} = await import('electron-devtools-installer');
	await installExtension(REACT_DEVELOPER_TOOLS);
	await installExtension(REDUX_DEVTOOLS);
};

export const setupDevelopmentTools = () => {
	if (process.env.NODE_ENV !== 'development') {
		return;
	}

	app.setPath('userData', path.join(app.getPath('appData'), `${ app.name } (development)`));

	setupElectronReloader();
	installDevTools();
};
