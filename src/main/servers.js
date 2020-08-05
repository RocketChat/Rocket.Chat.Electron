import fs from 'fs';
import path from 'path';
import url from 'url';

import { app } from 'electron';
import fetch from 'electron-main-fetch';

import { PERSISTABLE_VALUES_MERGED } from '../actions';
import { selectServers, selectCurrentServerUrl } from './selectors';

export const ValidationResult = {
	OK: Symbol('OK'),
	TIMEOUT: Symbol('TIMEOUT'),
	INVALID: Symbol('INVALID'),
};

export const validateServerUrl = async (serverUrl, timeout = 5000) => {
	const {
		username,
		password,
		href,
	} = url.parse(serverUrl);
	let headers = {};

	if (username && password) {
		headers = {
			Authorization: `Basic ${ btoa(`${ username }:${ password }`) }`,
		};
	}

	try {
		const [response] = await Promise.race([
			fetch(`${ href.replace(/\/$/, '') }/api/info`, { headers }),
			new Promise((resolve) => setTimeout(resolve, timeout)),
		]);

		if (!response) {
			return ValidationResult.TIMEOUT;
		}

		if (!response.ok) {
			return ValidationResult.INVALID;
		}

		if (!(await response.json()).success) {
			return ValidationResult.INVALID;
		}

		return ValidationResult.OK;
	} catch (error) {
		console.error(error);
		return ValidationResult.INVALID;
	}
};

export const normalizeServerUrl = (hostUrl) => {
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

export const getServerInfo = async (/* serverUrl */) => {
	throw Error('not implemented');
};

const loadAppServers = async () => {
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

const loadUserServers = async () => {
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

export const setupServers = async (reduxStore, localStorage) => {
	let servers = selectServers(reduxStore.getState());
	let currentServerUrl = selectCurrentServerUrl(reduxStore.getState());

	const serversMap = new Map(
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
				servers = [...serversMap.entries()]
					.sort(([a], [b]) => sorting.indexOf(a) - sorting.indexOf(b));
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
