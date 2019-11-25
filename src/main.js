import path from 'path';

import { app } from 'electron';
import setupElectronReload from 'electron-reload';
import jetpack from 'fs-jetpack';

import { setupErrorHandling } from './errorHandling';
import { getMainWindow } from './main/mainWindow';
import { setupI18next } from './i18n';

if (process.env.NODE_ENV) {
	setupElectronReload(__dirname, {
		electron: process.execPath,
	});
}

async function prepareApp() {
	setupErrorHandling('main');

	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');

	const dirName = process.env.NODE_ENV === 'production' ? app.name : `${ app.name } (${ process.env.NODE_ENV })`;

	app.setPath('userData', path.join(app.getPath('appData'), dirName));

	if (process.argv[2] === '--reset-app-data') {
		const dataDir = app.getPath('userData');
		await jetpack.removeAsync(dataDir);
		app.relaunch({ args: [process.argv[1]] });
		app.exit();
		return;
	}

	const canStart = process.mas || app.requestSingleInstanceLock();

	if (!canStart) {
		app.exit();
		return;
	}

	app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

	// TODO: make it a setting
	if (process.platform === 'linux') {
		app.disableHardwareAcceleration();
	}

	app.on('window-all-closed', () => {
		app.quit();
	});

	const preventEvent = (event) => event.preventDefault();

	app.on('certificate-error', preventEvent);
	app.on('login', preventEvent);
	app.on('open-url', preventEvent);
}

(async () => {
	await prepareApp();

	await app.whenReady();

	await setupI18next();

	app.emit('start');
	await getMainWindow();
})();
