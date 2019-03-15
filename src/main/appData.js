import { app, ipcMain } from 'electron';
import jetpack from 'fs-jetpack';
import path from 'path';


const definePath = () => {
	const appName = app.getName();
	const dirName = process.env.NODE_ENV === 'production' ? appName : `${ appName } (${ process.env.NODE_ENV })`;

	app.setPath('userData', path.join(app.getPath('appData'), dirName));
};

const reset = () => {
	const dataDir = app.getPath('userData');
	jetpack.remove(dataDir);
	app.relaunch({ args: [process.argv[1]] });
	app.quit();
};

const migrate = () => {
	const olderAppName = 'Rocket.Chat+';
	const dirName = process.env.NODE_ENV === 'production' ? olderAppName : `${ olderAppName } (${ process.env.NODE_ENV })`;
	const olderUserDataPath = path.join(app.getPath('appData'), dirName);

	try {
		jetpack.copy(olderUserDataPath, app.getPath('userData'), { overwrite: true });
		jetpack.remove(olderUserDataPath);
	} catch (e) {
		return;
	}
};

const initialize = () => {
	definePath();

	if (process.argv[2] === '--reset-app-data') {
		reset();
		return;
	}

	migrate();
};

ipcMain.on('reset-app-data', () => {
	app.relaunch({ args: [process.argv[1], '--reset-app-data'] });
	app.quit();
});

export default {
	initialize,
};
