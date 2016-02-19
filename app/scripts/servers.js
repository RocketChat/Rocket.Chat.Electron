/* globals $ */

import { EventEmitter } from 'events';

class Servers extends EventEmitter {
	constructor() {
		super();
		this.load();
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
		var hosts = localStorage.getItem(this.hostsKey);

		try {
			hosts = JSON.parse(hosts);
		} catch (e) {
			if (typeof hosts === 'string' && hosts.match(/^https?:\/\//)) {
				hosts = {};
				hosts[hosts] = {
					title: hosts,
					url: hosts
				};
			}

			localStorage.setItem(this.hostsKey, JSON.stringify(hosts));
		}

		if (hosts === null) {
			hosts = {};
		}

		if (Array.isArray(hosts)) {
			var oldHosts = hosts;
			hosts = {};
			oldHosts.forEach(function(item) {
				item = item.replace(/\/$/, '');
				hosts[item] = {
					title: item,
					url: item
				};
			});
			localStorage.setItem(this.hostsKey, JSON.stringify(hosts));
		}

		for (var id in hosts) {
			if (hosts.hasOwnProperty(id)) {
				hosts[id].id = hosts[id].id || hosts[id].url;
			}
		}

		this._hosts = hosts;
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
		for (var host in this.hosts) {
			if (this.hosts.hasOwnProperty(host)) {
				cb(this.hosts[host]);
			}
		}
	}

	validateHost(hostUrl, timeout) {
		const self = this;

		console.log('Validating hostUrl', hostUrl);
		timeout = timeout || 5000;
		return new Promise(function(resolve, reject) {
			let resolved = false;
			const parsedHost = self.parseHostUrl(hostUrl);

			const requestOptions = {
				dataType: 'json',
				url: `${parsedHost.url}/api/info`,
				headers: parsedHost.headers
			};

			$.ajax(requestOptions).then(function() {
				if (resolved) {
					return;
				}
				resolved = true;
				console.log('HostUrl valid', hostUrl);
				resolve();
			},function(request) {
				if (resolved) {
					return;
				}
				resolved = true;
				console.log('HostUrl invalid', hostUrl);
				reject(request.status);
			});
			if (timeout) {
				setTimeout(function() {
					if (resolved) {
						return;
					}
					resolved = true;
					console.log('Validating hostUrl TIMEOUT', hostUrl);
					reject();
				}, timeout);
			}
		});
	}

	hostExists(hostUrl) {
		var hosts = this.hosts;

		return !!hosts[hostUrl];
	}

	addHost(hostUrl) {
		var hosts = this.hosts;

		if (this.hostExists(hostUrl) === true) {
			return false;
		}

		const parsedHost = this.parseHostUrl(hostUrl);

		hosts[hostUrl] = {
			id: hostUrl,
			title: parsedHost.url,
			url: parsedHost.url,
			headers: parsedHost.headers
		};
		this.hosts = hosts;

		this.emit('host-added', hostUrl);

		return true;
	}

	removeHost(hostUrl) {
		var hosts = this.hosts;
		if (hosts[hostUrl]) {
			delete hosts[hostUrl];
			this.hosts = hosts;
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
		if (this.hostExists(hostUrl)) {
			localStorage.setItem(this.activeKey, hostUrl);
			this.emit('active-setted', hostUrl);
			return true;
		}
		return false;
	}

	restoreActive() {
		servers.setActive(servers.active);
	}

	clearActive() {
		localStorage.removeItem(this.activeKey);
		this.emit('active-cleared');
		return true;
	}

	setHostTitle(hostUrl, title) {
		if (title === 'Rocket.Chat' && /https?:\/\/demo\.rocket\.chat/.test(hostUrl) === false) {
			title += ' - ' + hostUrl;
		}
		var hosts = this.hosts;
		hosts[hostUrl].title = title;
		this.hosts = hosts;
		this.emit('title-setted', hostUrl, title);
	}

	parseHostUrl(hostUrl) {
		const result = {};

		if (hostUrl.indexOf('#') > 0) {
			hostUrl = hostUrl.split('#');
			result.headers ={
				Authorization: `Bearer ${hostUrl[1]}`
			};
			result.url = hostUrl[0];
		} else {
			result.url = hostUrl;
		}

		return result;
	}
}

export var servers = new Servers();
