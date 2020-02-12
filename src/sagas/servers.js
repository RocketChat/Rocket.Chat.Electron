import { call, delay, put, race, select } from 'redux-saga/effects';

import { SERVERS_READY } from '../actions';
import { readFromStorage } from '../localStorage';
import { keepStoreValuePersisted, readConfigurationFile } from '../sagaUtils';

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

const loadAppServers = async (serversMap) => {
	const appConfiguration = await readConfigurationFile('servers.json', { appData: true });

	if (!appConfiguration) {
		return;
	}

	try {
		for (const [title, url] of Object.entries(appConfiguration)) {
			serversMap.set(url, { url, title });
		}
	} catch (error) {
		console.warn(error);
	}
};

const loadUserServers = async (serversMap) => {
	const userConfiguration = await readConfigurationFile('servers.json', { appData: false, purgeAfter: true });

	if (!userConfiguration) {
		return;
	}

	try {
		for (const [title, url] of Object.entries(userConfiguration)) {
			serversMap.set(url, { url, title });
		}
	} catch (error) {
		console.warn(error);
	}
};

function *loadServers() {
	const servers = yield select(({ servers }) => servers);

	const serversMap = new Map(
		readFromStorage('servers', servers)
			.filter(Boolean)
			.filter(({ url, title }) => typeof url === 'string' && typeof title === 'string')
			.map((server) => [server.url, server]),
	);

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
		console.warn(error);
	} finally {
		localStorage.removeItem('rocket.chat.hosts');
	}

	if (serversMap.size === 0) {
		yield call(loadAppServers, serversMap);
		yield call(loadUserServers, serversMap);
	}

	try {
		const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder'));
		if (Array.isArray(sorting)) {
			return [...serversMap.entries()].sort(([a], [b]) => sorting.indexOf(a) - sorting.indexOf(b));
		}
		localStorage.removeItem('rocket.chat.sortOrder');
	} catch (error) {
		console.warn(error);
	}

	return Array.from(serversMap.values());
}

function *loadCurrentServerUrl(servers) {
	let currentServerUrl = yield select(({ currentServerUrl }) => currentServerUrl);

	currentServerUrl = readFromStorage('currentServerUrl', currentServerUrl);

	const storedValue = localStorage.getItem('rocket.chat.currentHost');
	localStorage.removeItem('rocket.chat.currentHost');

	if (storedValue && storedValue !== 'null') {
		currentServerUrl = storedValue;
	}

	if (!servers.some(({ url }) => url === currentServerUrl)) {
		currentServerUrl = null;
	}

	return currentServerUrl;
}

export function *serversSaga() {
	const servers = yield *loadServers();
	const currentServerUrl = yield *loadCurrentServerUrl(servers);

	yield *keepStoreValuePersisted('servers');
	yield *keepStoreValuePersisted('currentServerUrl');

	yield put({
		type: SERVERS_READY,
		payload: {
			servers,
			currentServerUrl,
		},
	});
}
