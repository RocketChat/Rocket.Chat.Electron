import fs from 'fs';
import path from 'path';

import { remote } from 'electron';

import { readMap, writeMap, readString, writeString } from '../localStorage';

const validateHost = async (hostUrl, timeout = 5000) => {
	const headers = new Headers();

	if (hostUrl.includes('@')) {
		const url = new URL(hostUrl);
		hostUrl = url.origin;
		headers.set('Authorization', `Basic ${ btoa(`${ url.username }:${ url.password }`) }`);
	}

	const response = await Promise.race([
		fetch(`${ hostUrl }/api/info`, { headers }),
		new Promise((resolve, reject) => setTimeout(() => reject('timeout'), timeout)),
	]);

	if (!response.ok) {
		// eslint-disable-next-line no-throw-literal
		throw 'invalid';
	}
};

let servers = new Map();

const loadServers = async () => {
	servers = readMap('servers');

	try {
		const storedString = localStorage.getItem('rocket.chat.hosts');

		if (/^https?:\/\//.test(storedString)) {
			servers.set(storedString, { url: storedString, title: storedString });
		} else {
			const storedValue = JSON.parse(storedString);

			if (Array.isArray(storedValue)) {
				storedValue.map((url) => url.replace(/\/$/, '')).forEach((url) => {
					servers.set(url, { url, title: url });
				});
			}
		}
	} catch (error) {
		console.warn(error.stack);
	} finally {
		localStorage.removeItem('rocket.chat.hosts');
	}

	if (servers.size === 0) {
		const appConfigurationFilePath = path.join(
			remote.app.getAppPath(),
			remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
			'servers.json',
		);

		try {
			if (await fs.promises.stat(appConfigurationFilePath).then((stat) => stat.isFile(), () => false)) {
				const entries = JSON.parse(await fs.promises.readFile(appConfigurationFilePath, 'utf8'));

				for (const [title, url] of Object.entries(entries)) {
					servers.set(url, { url, title });
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
					servers.set(url, { url, title });
				}
			}
		} catch (error) {
			console.warn(error.stack);
		}
	}

	try {
		const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder'));
		if (Array.isArray(sorting)) {
			servers = new Map([...servers.entries()].sort(([a], [b]) => sorting.indexOf(a) - sorting.indexOf(b)));
		}
		localStorage.removeItem('rocket.chat.sortOrder');
	} catch (error) {
		console.warn(error.stack);
	}
};

let currentServerUrl = null;

const loadCurrentServerUrl = () => {
	currentServerUrl = readString('currentServerUrl', null);

	const storedValue = localStorage.getItem('rocket.chat.currentHost');
	localStorage.removeItem('rocket.chat.currentHost');

	if (storedValue && storedValue !== 'null') {
		currentServerUrl = storedValue;
	}
};

const setUp = async () => {
	await loadServers();
	await loadCurrentServerUrl();
	writeMap('servers', servers);
	writeString('currentServerUrl', currentServerUrl);
};

const tearDown = () => {
	servers = new Map();
};

const put = ({ url, ...props }) => {
	if (servers.has(url)) {
		servers.set(url, { ...servers.get(url), ...props });
		writeMap('servers', servers);
		return;
	}

	servers.set(url, { url, ...props });
	writeMap('servers', servers);
};

const remove = (url) => {
	const removed = servers.delete(url);

	if (!removed) {
		return;
	}

	if (currentServerUrl === url) {
		currentServerUrl = null;
	}

	writeMap('servers', servers);
	writeString('currentServerUrl', currentServerUrl);
};

const sort = (urls) => {
	servers = new Map([...servers.entries()].sort(([a], [b]) => urls.indexOf(a) - urls.indexOf(b)));
	writeMap('servers', servers);
};

const has = (url) => servers.has(url);

const setCurrentServerUrl = (_currentServerUrl) => {
	if (!_currentServerUrl || !servers.has(_currentServerUrl)) {
		currentServerUrl = null;
		writeString('currentServerUrl', currentServerUrl);
		return;
	}

	currentServerUrl = _currentServerUrl;
	writeString('currentServerUrl', currentServerUrl);
};

export default Object.freeze({
	setUp,
	tearDown,
	all: () => Array.from(servers.values()),
	put,
	remove,
	sort,
	has,
	getCurrentServerUrl: () => currentServerUrl,
	setCurrentServerUrl,
	validateHost,
});
