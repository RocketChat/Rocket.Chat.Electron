import { app } from 'electron';
import rimraf from 'rimraf';

export const relaunchApp = (...args) => {
	const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
	app.relaunch({ args: [...command, ...args] });
	app.exit();
};

export const handleStartup = (next) => {
	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');

	app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

	const args = process.argv.slice(app.isPackaged ? 1 : 2);

	if (args.includes('--reset-app-data')) {
		rimraf.sync(app.getPath('userData'));
		relaunchApp();
		return;
	}

	const canStart = process.mas || app.requestSingleInstanceLock();

	if (!canStart) {
		app.exit();
		return;
	}

	if (args.includes('--disable-gpu')) {
		app.disableHardwareAcceleration();
		app.commandLine.appendSwitch('--disable-2d-canvas-image-chromium');
		app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
		app.commandLine.appendSwitch('--disable-gpu');
	}

	next();
};
