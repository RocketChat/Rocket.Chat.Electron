import path from 'path';

import { app } from 'electron';

export const setUserDataDirectory = (): void => {
	if (process.env.NODE_ENV !== 'development') {
		return;
	}

	app.setPath('userData', path.join(app.getPath('appData'), `${ app.name } (development)`));
};
