import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

import { remote } from 'electron';

import { readMap, writeMap } from '../localStorage';

class Servers extends EventEmitter {
	_hosts = {}

	get hosts() {
		return this._hosts;
	}

	async validateHost(hostUrl, timeout = 5000) {
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
	}

	hostExists(hostUrl) {
		const { hosts } = this;

		return !!hosts[hostUrl];
	}

	get active() {
		const active = localStorage.getItem('rocket.chat.currentHost');
		return active === 'null' ? null : active;
	}

	setActive(hostUrl) {
		let url;
		if (this.hostExists(hostUrl)) {
			url = hostUrl;
		} else if (Object.keys(this._hosts).length > 0) {
			url = Object.keys(this._hosts)[0];
		}

		if (url) {
			localStorage.setItem('rocket.chat.currentHost', hostUrl);
			this.emit('active-setted', url);
			return true;
		}
		return false;
	}

	clearActive() {
		localStorage.removeItem('rocket.chat.currentHost');
		this.emit('active-cleared');
		return true;
	}
}

const instance = new Servers();

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

const setUp = async () => {
	await loadServers();
	writeMap('servers', servers);
	instance._hosts = Array.from(servers.values()).reduce((_hosts, server) => ({ ..._hosts, [server.url]: server }), {});
	instance.setActive(instance.active);
};

const tearDown = () => {
	instance.removeAllListeners();
	servers = new Map();
};

const put = ({ url, ...props }) => {
	if (servers.has(url)) {
		servers.set(url, { ...servers.get(url), ...props });
		writeMap('servers', servers);
		instance._hosts = Array.from(servers.values()).reduce((_hosts, server) => ({ ..._hosts, [server.url]: server }), {});
		return;
	}

	servers.set(url, { url, ...props });
	writeMap('servers', servers);
	instance._hosts = Array.from(servers.values()).reduce((_hosts, server) => ({ ..._hosts, [server.url]: server }), {});
};

const remove = (url) => {
	const removed = servers.delete(url);

	if (!removed) {
		return;
	}

	writeMap('servers', servers);
	instance._hosts = Array.from(servers.values()).reduce((_hosts, server) => ({ ..._hosts, [server.url]: server }), {});

	if (instance.active === url) {
		instance.clearActive();
	}
};

const sort = (urls) => {
	servers = new Map([...servers.entries()].sort(([a], [b]) => urls.indexOf(a) - urls.indexOf(b)));
	writeMap('servers', servers);
	instance._hosts = Array.from(servers.values()).reduce((_hosts, server) => ({ ..._hosts, [server.url]: server }), {});
};

const has = (url) => servers.has(url);

export default Object.seal(Object.assign(instance, {
	setUp,
	tearDown,
	all: () => Array.from(servers.values()),
	put,
	remove,
	sort,
	has,
}));
