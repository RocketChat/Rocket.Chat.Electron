import fs from 'fs';
import path from 'path';

import { remote } from 'electron';

export const getConfigurationPath = (filePath, { appData = true } = {}) => path.join(
	...appData ? [
		remote.app.getAppPath(),
		remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
	] : [remote.app.getPath('userData')],
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
