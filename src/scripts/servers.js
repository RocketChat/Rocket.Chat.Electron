import jetpack from 'fs-jetpack';
import { EventEmitter } from 'events';
import { remote, ipcRenderer } from 'electron';
import i18n from '../i18n';


class Servers extends EventEmitter {
	constructor() {
		super();
		this.load();
		const processProtocol = this.getProtocolUrlFromProcess(remote.process.argv);
		if (processProtocol) {
			this.showHostConfirmation(processProtocol);
		}
		ipcRenderer.on('add-host', (e, host) => {
			ipcRenderer.send('focus');
			if (this.hostExists(host)) {
				this.setActive(host);
			} else {
				this.showHostConfirmation(host);
			}
		});
	}

	get hosts() {
		return this._hosts;
	}

	set hosts(hosts) {
		this._hosts = hosts;
		this.save();
		return true;
	}

	get hostsKey() {
		return 'rocket.chat.hosts';
	}

	get activeKey() {
		return 'rocket.chat.currentHost';
	}

	load() {
		let hosts = localStorage.getItem(this.hostsKey);

		try {
			hosts = JSON.parse(hosts);
		} catch (e) {
			if (typeof hosts === 'string' && hosts.match(/^https?:\/\//)) {
				hosts = {};
				hosts[hosts] = {
					title: hosts,
					url: hosts,
				};
			}

			localStorage.setItem(this.hostsKey, JSON.stringify(hosts));
		}

		if (hosts === null) {
			hosts = {};
		}

		if (Array.isArray(hosts)) {
			const oldHosts = hosts;
			hosts = {};
			oldHosts.forEach(function(item) {
				item = item.replace(/\/$/, '');
				hosts[item] = {
					title: item,
					url: item,
				};
			});
			localStorage.setItem(this.hostsKey, JSON.stringify(hosts));
		}

		// Load server info from server config file
		if (Object.keys(hosts).length === 0) {
			const { app } = remote;
			const userDir = jetpack.cwd(app.getPath('userData'));
			const appDir = jetpack.cwd(jetpack.path(app.getAppPath(), app.getAppPath().endsWith('.asar') ? '..' : '.'));
			const path = (userDir.find({ matching: 'servers.json', recursive: false })[0] && userDir.path('servers.json')) ||
				(appDir.find({ matching: 'servers.json', recursive: false })[0] && appDir.path('servers.json'));

			if (path) {
				try {
					const result = jetpack.read(path, 'json');
					if (result) {
						hosts = {};
						Object.keys(result).forEach((title) => {
							const url = result[title];
							hosts[url] = { title, url };
						});
						localStorage.setItem(this.hostsKey, JSON.stringify(hosts));
						// Assume user doesn't want sidebar if they only have one server
						if (Object.keys(hosts).length === 1) {
							localStorage.setItem('sidebar-closed', 'true');
						}
					}

				} catch (e) {
					console.error('Server file invalid');
				}
			}
		}

		this._hosts = hosts;
		ipcRenderer.send('update-servers', this._hosts);
		this.emit('loaded');
	}

	save() {
		localStorage.setItem(this.hostsKey, JSON.stringify(this._hosts));
		this.emit('saved');
	}

	get(hostUrl) {
		return this.hosts[hostUrl];
	}

	forEach(cb) {
		for (const host in this.hosts) {
			if (this.hosts.hasOwnProperty(host)) {
				cb(this.hosts[host]);
			}
		}
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
			throw 'invalid';
		}
	}

	hostExists(hostUrl) {
		const { hosts } = this;

		return !!hosts[hostUrl];
	}

	addHost(hostUrl) {
		const { hosts } = this;

		const match = hostUrl.match(/^(https?:\/\/)([^:]+):([^@]+)@(.+)$/);
		let username;
		let password;
		let authUrl;
		if (match) {
			authUrl = hostUrl;
			hostUrl = match[1] + match[4];
			username = match[2];
			password = match[3];
		}

		if (this.hostExists(hostUrl) === true) {
			this.setActive(hostUrl);
			return false;
		}

		hosts[hostUrl] = {
			title: hostUrl,
			url: hostUrl,
			authUrl,
			username,
			password,
		};
		this.hosts = hosts;

		ipcRenderer.send('update-servers', this._hosts);

		this.emit('host-added', hostUrl);

		return hostUrl;
	}

	removeHost(hostUrl) {
		const { hosts } = this;
		if (hosts[hostUrl]) {
			delete hosts[hostUrl];
			this.hosts = hosts;

			ipcRenderer.send('update-servers', this._hosts);

			if (this.active === hostUrl) {
				this.clearActive();
			}
			this.emit('host-removed', hostUrl);
		}
	}

	get active() {
		const active = localStorage.getItem(this.activeKey);
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
			localStorage.setItem(this.activeKey, hostUrl);
			this.emit('active-setted', url);
			return true;
		}
		this.emit('loaded');
		return false;
	}

	restoreActive() {
		this.setActive(this.active);
	}

	clearActive() {
		localStorage.removeItem(this.activeKey);
		this.emit('active-cleared');
		return true;
	}

	setHostTitle(hostUrl, title) {
		if (title === 'Rocket.Chat' && /https?:\/\/open\.rocket\.chat/.test(hostUrl) === false) {
			title += ` - ${ hostUrl }`;
		}
		const { hosts } = this;
		hosts[hostUrl].title = title;
		this.hosts = hosts;
		this.emit('title-setted', hostUrl, title);
	}
	getProtocolUrlFromProcess(args) {
		let site = null;
		if (args.length > 1) {
			const protocolURI = args.find((arg) => arg.startsWith('rocketchat://'));
			if (protocolURI) {
				site = protocolURI.split(/\/|\?/)[2];
				if (site) {
					let scheme = 'https://';
					if (protocolURI.includes('insecure=true')) {
						scheme = 'http://';
					}
					site = scheme + site;
				}
			}
		}
		return site;
	}
	showHostConfirmation(host) {
		return remote.dialog.showMessageBox({
			type: 'question',
			buttons: [i18n.__('dialog.addServer.add'), i18n.__('dialog.addServer.cancel')],
			defaultId: 0,
			title: i18n.__('dialog.addServer.title'),
			message: i18n.__('dialog.addServer.message', { host }),
		}, (response) => {
			if (response === 0) {
				this.validateHost(host)
					.then(() => this.addHost(host))
					.then(() => this.setActive(host))
					.catch(() => remote.dialog.showErrorBox(i18n.__('dialog.addServerError.title'), i18n.__('dialog.addServerError.message', { host })));
			}
		});
	}

	resetAppData() {
		const response = remote.dialog.showMessageBox({
			type: 'question',
			buttons: [i18n.__('dialog.resetAppData.yes'), i18n.__('dialog.resetAppData.cancel')],
			defaultId: 1,
			title: i18n.__('dialog.resetAppData.title'),
			message: i18n.__('dialog.resetAppData.message'),
		});

		if (response !== 0) {
			return;
		}

		ipcRenderer.send('reset-app-data');
	}

}

export default new Servers();
