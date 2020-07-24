import path from 'path';

import { app } from 'electron';

export const setupDevelopmentTools = () => {
	if (process.env.NODE_ENV !== 'development') {
		return;
	}

	app.setPath('userData', path.join(app.getPath('appData'), `${ app.name } (development)`));

	app.whenReady()
		.then(() => Promise.all([
			import('electron-reloader'),
			import('electron-devtools-installer'),
		]))
		.then(([
			{ default: setupElectronReloader },
			{
				default: installExtension,
				REACT_DEVELOPER_TOOLS,
				REDUX_DEVTOOLS,
			},
		]) => Promise.all([
			setupElectronReloader(require.main),
			installExtension(REACT_DEVELOPER_TOOLS),
			installExtension(REDUX_DEVTOOLS),
		]));
};
