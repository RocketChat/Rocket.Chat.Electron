import { app } from 'electron';
import rimraf from 'rimraf';

export const handleStartup = () => {
	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');

	app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

	const [relaunchArgs, args] = [
		process.argv.slice(1, app.isPackaged ? 1 : 2),
		process.argv.slice(app.isPackaged ? 1 : 2),
	];

	if (args.includes('--disable-gpu')) {
		app.disableHardwareAcceleration();
		app.commandLine.appendSwitch('--disable-2d-canvas-image-chromium');
		app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
		app.commandLine.appendSwitch('--disable-gpu');
	}

	if (args.includes('--reset-app-data')) {
		rimraf.sync(app.getPath('userData'));
		app.relaunch({ args: relaunchArgs });
		app.exit();
		return;
	}

	const canStart = process.mas || app.requestSingleInstanceLock();

	if (!canStart) {
		app.exit();
	}
};
