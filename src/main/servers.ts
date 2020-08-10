import fs from 'fs';
import path from 'path';
import url from 'url';

import { app } from 'electron';
import fetch from 'node-fetch';
import { Store } from 'redux';
import { takeEvery, call, put, Effect, take } from 'redux-saga/effects';

import {
	PERSISTABLE_VALUES_MERGED,
	SERVER_VALIDATION_REQUESTED,
	SERVER_VALIDATION_RESPONDED,
	CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
	SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
	SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
} from '../actions';
import { RequestAction } from '../channels';
import { selectServers, selectCurrentServerUrl } from '../selectors';
import { ValidationResult, Server } from '../structs/servers';

export const validateServerUrl = async (serverUrl: string, timeout = 5000): Promise<ValidationResult> => {
	try {
		const { username, password, href } = new URL(serverUrl);
		const headers: HeadersInit = [];

		if (username && password) {
			headers.push(['Authorization', `Basic ${ btoa(`${ username }:${ password }`) }`]);
		}

		const response = await Promise.race([
			fetch(`${ href.replace(/\/$/, '') }/api/info`, { headers }),
			new Promise<void>((resolve) => {
				setTimeout(resolve, timeout);
			}),
		]);

		if (!response) {
			return ValidationResult.TIMEOUT;
		}

		if (!response.ok) {
			return ValidationResult.INVALID;
		}

		const responseBody = await response.json();

		if (!responseBody.success) {
			return ValidationResult.INVALID;
		}

		return ValidationResult.OK;
	} catch (error) {
		console.error(error);
		return ValidationResult.INVALID;
	}
};

export const normalizeServerUrl = (hostUrl: string): string => {
	if (typeof hostUrl !== 'string') {
		return;
	}

	let parsedUrl = url.parse(hostUrl);

	if (!parsedUrl.hostname && parsedUrl.pathname) {
		parsedUrl = url.parse(`https://${ parsedUrl.pathname }`);
	}

	const { protocol, auth, hostname, port, pathname } = parsedUrl;

	if (!protocol || !hostname) {
		return;
	}

	return url.format({ protocol, auth, hostname, port, pathname });
};

export const getServerInfo = async (_serverUrl: string): Promise<never> => {
	throw Error('not implemented');
};

const loadAppServers = async (): Promise<Record<string, string>> => {
	try {
		const filePath = path.join(
			app.getAppPath(),
			app.getAppPath().endsWith('app.asar') ? '..' : '.',
			'servers.json',
		);
		const content = await fs.promises.readFile(filePath, 'utf8');
		const json = JSON.parse(content);

		return json && typeof json === 'object' ? json : {};
	} catch (error) {
		return {};
	}
};

const loadUserServers = async (): Promise<Record<string, string>> => {
	try {
		const filePath = path.join(app.getPath('userData'), 'servers.json');
		const content = await fs.promises.readFile(filePath, 'utf8');
		const json = JSON.parse(content);
		await fs.promises.unlink(filePath);

		return json && typeof json === 'object' ? json : {};
	} catch (error) {
		return {};
	}
};

export const setupServers = async (reduxStore: Store, localStorage: Record<string, string>): Promise<void> => {
	let servers = selectServers(reduxStore.getState()) as Server[];
	let currentServerUrl = selectCurrentServerUrl(reduxStore.getState());

	const serversMap = new Map<Server['url'], Server>(
		servers
			.filter(Boolean)
			.filter(({ url, title }) => typeof url === 'string' && typeof title === 'string')
			.map((server) => [server.url, server]),
	);

	if (localStorage['rocket.chat.hosts']) {
		try {
			const storedString = JSON.parse(localStorage['rocket.chat.hosts']);

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
		}
	}

	if (serversMap.size === 0) {
		const appConfiguration = await loadAppServers();

		for (const [title, url] of Object.entries(appConfiguration)) {
			serversMap.set(url, { url, title });
		}

		const userConfiguration = await loadUserServers();

		for (const [title, url] of Object.entries(userConfiguration)) {
			serversMap.set(url, { url, title });
		}
	}

	if (localStorage['rocket.chat.currentHost'] && localStorage['rocket.chat.currentHost'] !== 'null') {
		currentServerUrl = localStorage['rocket.chat.currentHost'];
	}

	servers = Array.from(serversMap.values());
	currentServerUrl = serversMap.get(currentServerUrl)?.url ?? null;

	if (localStorage['rocket.chat.sortOrder']) {
		try {
			const sorting = JSON.parse(localStorage['rocket.chat.sortOrder']);
			if (Array.isArray(sorting)) {
				servers = [...serversMap.values()]
					.sort((a, b) => sorting.indexOf(a.url) - sorting.indexOf(b.url));
			}
		} catch (error) {
			console.warn(error);
		}
	}

	reduxStore.dispatch({
		type: PERSISTABLE_VALUES_MERGED,
		payload: {
			servers,
			currentServerUrl,
		},
	});
};

export function *takeServersActions(): Generator<Effect> {
	yield takeEvery(SERVER_VALIDATION_REQUESTED, function *(action: RequestAction<{ serverUrl: string; timeout: number }>) {
		const { meta: { id }, payload: { serverUrl, timeout } } = action;

		try {
			const validationResult = yield call(() => validateServerUrl(serverUrl, timeout));
			yield put({ type: SERVER_VALIDATION_RESPONDED, meta: { id, response: true }, payload: validationResult });
		} catch (error) {
			yield put({ type: SERVER_VALIDATION_RESPONDED, meta: { id, response: true }, payload: error, error: true });
		}
	});

	yield takeEvery(CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED, function *(action: RequestAction<unknown[]>) {
		const { meta: { id } } = action;

		const responseAction = yield take([
			SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
			SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
		]);

		const fingerprint = responseAction.type === SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED
			? responseAction.payload
			: null;

		yield put({ type: SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED, meta: { id, response: true }, payload: fingerprint });
	});
}
