import fs from 'fs';
import path from 'path';

import { app } from 'electron';

export const getConfigurationPath = (filePath, { appData = true } = {}) => path.join(
	...appData ? [
		app.getAppPath(),
		app.getAppPath().endsWith('app.asar') ? '..' : '.',
	] : [app.getPath('userData')],
	filePath,
);

export const readConfigurationFile = async (filePath, {
	appData = true,
	purgeAfter = false,
} = {}) => {
	try {
		const configurationFilePath = getConfigurationPath(filePath, { appData });

		if (!await fs.promises.stat(filePath).then((stat) => stat.isFile(), () => false)) {
			return null;
		}

		const content = JSON.parse(await fs.promises.readFile(configurationFilePath, 'utf8'));

		if (!appData && purgeAfter) {
			await fs.promises.unlink(configurationFilePath);
		}

		return content;
	} catch (error) {
		console.warn(error);
		return null;
	}
};
