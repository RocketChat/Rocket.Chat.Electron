import jetpack from 'fs-jetpack';
import { EventEmitter } from 'events';
import { remote, ipcRenderer } from 'electron';
import i18n from '../i18n/index.js';
const { remoteServers } = remote.require('./background');

class Servers extends EventEmitter {
	constructor() {
		super();
		this.load();
		const processProtocol = this.getProtocolUrlFromProcess(remote.process.argv);
		if (processProtocol) {
			this.showHostConfirmation(processProtocol);
		}
		ipcRenderer.on('add-host', (e, host) => {
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
			const path = userDir.find({ matching: 'servers.json', recursive: false })[0] ||
				appDir.find({ matching: 'servers.json', recursive: false })[0];

			if (path) {
				const pathToServerJson = jetpack.path(path);

				try {
					const result = jetpack.read(pathToServerJson, 'json');
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
		remoteServers.loadServers(this._hosts);
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
		const response = await Promise.race([
			fetch(`${ hostUrl }/api/info`),
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

		remoteServers.loadServers(this.hosts);

		this.emit('host-added', hostUrl);

		return hostUrl;
	}

	removeHost(hostUrl) {
		const { hosts } = this;
		if (hosts[hostUrl]) {
			delete hosts[hostUrl];
			this.hosts = hosts;

			remoteServers.loadServers(this.hosts);

			if (this.active === hostUrl) {
				this.clearActive();
			}
			this.emit('host-removed', hostUrl);
		}
	}

	get active() {
		return localStorage.getItem(this.activeKey);
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
			buttons: [i18n.__('Add'), i18n.__('Cancel')],
			defaultId: 0,
			title: i18n.__('Add_Server'),
			message: i18n.__('Add_host_to_servers', host),
		}, (response) => {
			if (response === 0) {
				this.validateHost(host)
					.then(() => this.addHost(host))
					.then(() => this.setActive(host))
					.catch(() => remote.dialog.showErrorBox(i18n.__('Invalid_Host'), i18n.__('Host_not_validated', host)));
			}
		});
	}

	resetAppData() {
		const response = remote.dialog.showMessageBox({
			type: 'question',
			buttons: ['Yes', 'Cancel'],
			defaultId: 1,
			title: i18n.__('Reset app data'),
			message: i18n.__('This will sign you out from all your teams and reset the app back to its ' +
				'original settings. This cannot be undone.'),
		});

		if (response !== 0) {
			return;
		}

		ipcRenderer.send('reset-app-data');
	}

}

export default new Servers();
