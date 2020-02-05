import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import { call, delay, put, race, select, takeEvery } from 'redux-saga/effects';

import {
	ADD_SERVER_VIEW_SERVER_ADDED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	SERVERS_READY,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_SERVER_SELECTED,
	SIDE_BAR_SERVERS_SORTED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	WEBVIEW_DID_NAVIGATE,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_UNREAD_CHANGED,
} from '../actions';
import { readString, writeString, writeArrayOf, readArrayOf } from '../localStorage';

export function *validateHostSaga(hostUrl, timeout = 5000) {
	const headers = new Headers();

	if (hostUrl.includes('@')) {
		const url = new URL(hostUrl);
		hostUrl = url.origin;
		headers.set('Authorization', `Basic ${ btoa(`${ url.username }:${ url.password }`) }`);
	}

	const response = yield race([
		call(fetch, `${ hostUrl }/api/info`, { headers }),
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
	yield takeEvery([
		ADD_SERVER_VIEW_SERVER_ADDED,
		MENU_BAR_ADD_NEW_SERVER_CLICKED,
		MENU_BAR_SELECT_SERVER_CLICKED,
		SERVERS_READY,
		SIDE_BAR_ADD_NEW_SERVER_CLICKED,
		SIDE_BAR_REMOVE_SERVER_CLICKED,
		SIDE_BAR_SERVER_SELECTED,
		TOUCH_BAR_SELECT_SERVER_TOUCHED,
		WEBVIEW_FOCUS_REQUESTED,
	], function *() {
		const currentServerUrl = yield select(({ currentServerUrl }) => currentServerUrl);
		writeString('currentServerUrl', currentServerUrl);
	});

	yield takeEvery([
		ADD_SERVER_VIEW_SERVER_ADDED,
		SERVERS_READY,
		SIDE_BAR_REMOVE_SERVER_CLICKED,
		SIDE_BAR_SERVERS_SORTED,
		WEBVIEW_DID_NAVIGATE,
		WEBVIEW_SIDEBAR_STYLE_CHANGED,
		WEBVIEW_TITLE_CHANGED,
		WEBVIEW_UNREAD_CHANGED,
	], function *() {
		const servers = yield select(({ servers }) => servers);
		writeArrayOf(castServer, 'servers', servers);
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
