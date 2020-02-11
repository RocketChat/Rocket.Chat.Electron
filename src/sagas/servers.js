import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import { call, delay, put, race, select, takeEvery } from 'redux-saga/effects';

import { SERVERS_READY } from '../actions';
import { readString, writeString, writeArrayOf, readArrayOf } from '../localStorage';

export function *validateServerUrl(serverUrl, timeout = 5000) {
	const url = new URL(serverUrl);
	const headers = new Headers();

	if (url.username && url.password) {
		headers.set('Authorization', `Basic ${ btoa(`${ url.username }:${ url.password }`) }`);
	}

	const [response] = yield race([
		call(fetch, `${ url.href.replace(/\/$/, '') }/api/info`, { headers }),
		delay(timeout),
	]);

	if (!response) {
		// eslint-disable-next-line no-throw-literal
		throw 'timeout';
	}

	if (!response.ok) {
		// eslint-disable-next-line no-throw-literal
		throw 'invalid';
	}

	if (!(yield call(::response.json)).success) {
		// eslint-disable-next-line no-throw-literal
		throw 'invalid';
	}
}

const castServer = (server) => {
	if (typeof server.url === 'string' && typeof server.title === 'string') {
		return server;
	}
};

const loadServers = async () => {
	const serversMap = new Map(readArrayOf(castServer, 'servers', []).map((server) => [server.url, server]));

	try {
		const storedString = localStorage.getItem('rocket.chat.hosts');

		if (/^https?:\/\//.test(storedString)) {
			serversMap.set(storedString, { url: storedString, title: storedString });
		} else {
			const storedValue = JSON.parse(storedString);

			if (Array.isArray(storedValue)) {
				storedValue.map((url) => url.replace(/\/$/, '')).forEach((url) => {
					serversMap.set(url, { url, title: url });
				});
			}
		}
	} catch (error) {
		console.warn(error.stack);
	} finally {
		localStorage.removeItem('rocket.chat.hosts');
	}

	if (serversMap.size === 0) {
		const appConfigurationFilePath = path.join(
			remote.app.getAppPath(),
			remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
			'servers.json',
		);

		try {
			if (await fs.promises.stat(appConfigurationFilePath).then((stat) => stat.isFile(), () => false)) {
				const entries = JSON.parse(await fs.promises.readFile(appConfigurationFilePath, 'utf8'));

				for (const [title, url] of Object.entries(entries)) {
					serversMap.set(url, { url, title });
				}
			}
		} catch (error) {
			console.warn(error.stack);
		}

		const userConfigurationFilePath = path.join(remote.app.getPath('userData'), 'servers.json');
		try {
			if (await fs.promises.stat(userConfigurationFilePath).then((stat) => stat.isFile(), () => false)) {
				const entries = JSON.parse(await fs.promises.readFile(userConfigurationFilePath, 'utf8'));
				await fs.promises.unlink(userConfigurationFilePath);

				for (const [title, url] of Object.entries(entries)) {
					serversMap.set(url, { url, title });
				}
			}
		} catch (error) {
			console.warn(error.stack);
		}
	}

	try {
		const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder'));
		if (Array.isArray(sorting)) {
			return [...serversMap.entries()].sort(([a], [b]) => sorting.indexOf(a) - sorting.indexOf(b));
		}
		localStorage.removeItem('rocket.chat.sortOrder');
	} catch (error) {
		console.warn(error.stack);
	}

	return Array.from(serversMap.values());
};

const loadCurrentServerUrl = (servers) => {
	let currentServerUrl = readString('currentServerUrl', null);

	const storedValue = localStorage.getItem('rocket.chat.currentHost');
	localStorage.removeItem('rocket.chat.currentHost');

	if (storedValue && storedValue !== 'null') {
		currentServerUrl = storedValue;
	}

	if (!servers.some(({ url }) => url === currentServerUrl)) {
		currentServerUrl = null;
	}

	return currentServerUrl;
};

export function *serversSaga() {
	let prevCurrentServerUrl = yield select(({ currentServerUrl }) => currentServerUrl);
	yield takeEvery('*', function *() {
		const currentServerUrl = yield select(({ currentServerUrl }) => currentServerUrl);
		if (prevCurrentServerUrl !== currentServerUrl) {
			writeString('currentServerUrl', currentServerUrl);
			prevCurrentServerUrl = currentServerUrl;
		}
	});

	let prevServers = yield select(({ servers }) => servers);
	yield takeEvery('*', function *() {
		const servers = yield select(({ servers }) => servers);

		const serverUrls = servers.map(({ url }) => url);
		const removedServers = prevServers.filter(({ url }) => !serverUrls.includes(url));
		removedServers.forEach((server) => {
			remote.getCurrentWebContents().session.clearStorageData({
				origin: server.url,
			});
		});

		if (prevServers !== servers) {
			writeArrayOf(castServer, 'servers', servers);
			prevServers = servers;
		}
	});

	const servers = yield call(loadServers);
	const currentServerUrl = yield call(loadCurrentServerUrl, servers);

	yield put({
		type: SERVERS_READY,
		payload: {
			servers,
			currentServerUrl,
		},
	});
}
