import { app } from 'electron';
import appData from './main/appData';
import './main/basicAuth';
import { processDeepLink } from './main/deepLinks';
import './main/systemIdleTime';
import './main/updates';
import { getMainWindow } from './main/mainWindow';
import './main/dialogs/about';
import './main/dialogs/screenshare';
import './main/dialogs/update';
import i18n from './i18n';
export { default as dock } from './main/dock';
export { default as menus } from './main/menus';
export { default as tray } from './main/tray';
export { default as notifications } from './main/notifications';
export { default as certificate } from './main/certificateStore';


function handleUncaughtException(error) {
	console.error(error);
	app.exit(1);
}

function handleUnhandledRejection(reason) {
	console.error(reason);
	app.exit(1);
}

async function prepareApp() {
	process.on('uncaughtException', handleUncaughtException);
	process.on('unhandledRejection', handleUnhandledRejection);

	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');

	await appData.initialize();

	const canStart = process.mas || app.requestSingleInstanceLock();

	if (!canStart) {
		app.quit();
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

	app.on('open-url', (event, url) => {
		event.preventDefault();
		processDeepLink(url);
	});

	app.on('second-instance', (event, argv) => {
		argv.slice(2).forEach(processDeepLink);
	});
}

(async () => {
	await prepareApp();
	await app.whenReady();
	await i18n.initialize();
	app.emit('start');
	await getMainWindow();
	process.argv.slice(2).forEach(processDeepLink);
})();
