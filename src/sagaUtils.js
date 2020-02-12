import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import { eventChannel } from 'redux-saga';
import { select, takeEvery } from 'redux-saga/effects';

import { writeToStorage } from './localStorage';

export function *keepStoreValuePersisted(key) {
	const selector = (state) => state[key];

	let prevValue = yield select(selector);

	yield takeEvery('*', function *() {
		const value = yield select(selector);
		if (prevValue !== value) {
			writeToStorage(key, value);
			prevValue = value;
		}
	});
}

export const createEventChannelFromEmitter = (emitter, eventName) => eventChannel((emit) => {
	const listener = (...args) => emit(args);

	const cleanUp = () => {
		emitter.removeListener(eventName, listener);
		window.removeEventListener('beforeunload', cleanUp);
	};

	emitter.addListener(eventName, listener);
	window.addEventListener('beforeunload', cleanUp);

	return cleanUp;
});

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
