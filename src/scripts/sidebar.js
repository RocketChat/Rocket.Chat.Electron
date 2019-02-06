import { EventEmitter } from 'events';
import { remote } from 'electron';
import i18n from '../i18n/index.js';
import servers from './servers';
import webview from './webview';

class SideBar extends EventEmitter {
	constructor() {
		super();

		this.sortOrder = JSON.parse(localStorage.getItem(this.sortOrderKey)) || [];
		localStorage.setItem(this.sortOrderKey, JSON.stringify(this.sortOrder));

		this.listElement = document.getElementById('sidebar__servers');

		Object.values(servers.hosts)
			.sort((a, b) => this.sortOrder.indexOf(a.url) - this.sortOrder.indexOf(b.url))
			.forEach((host) => {
				this.add(host);
			});

		servers.on('host-added', (hostUrl) => {
			this.add(servers.get(hostUrl));
		});

		servers.on('host-removed', (hostUrl) => {
			this.remove(hostUrl);
		});

		servers.on('active-setted', (hostUrl) => {
			this.setActive(hostUrl);
		});

		servers.on('active-cleared', (hostUrl) => {
			this.deactiveAll(hostUrl);
		});

		servers.on('title-setted', (hostUrl, title) => {
			this.setLabel(hostUrl, title);
		});

		webview.on('dom-ready', (hostUrl) => {
			this.setActive(localStorage.getItem(servers.activeKey));
			webview.getActive().send('request-sidebar-color');
			this.setImage(hostUrl);
			if (this.isHidden()) {
				this.hide();
			} else {
				this.show();
			}
		});

	}

	get sortOrderKey() {
		return 'rocket.chat.sortOrder';
	}

	add(host) {
		let name = host.title.replace(/^https?:\/\/(?:www\.)?([^\/]+)(.*)/, '$1');
		name = name.split('.');
		name = name[0][0] + (name[1] ? name[1][0] : '');
		name = name.toUpperCase();

		const initials = document.createElement('span');
		initials.innerHTML = name;

		const tooltip = document.createElement('div');
		tooltip.classList.add('tooltip');
		tooltip.innerHTML = host.title;

		const badge = document.createElement('div');
		badge.classList.add('badge');

		const img = document.createElement('img');
		img.onload = function() {
			img.style.display = 'initial';
			initials.style.display = 'none';
		};

		let hostOrder = 0;
		if (this.sortOrder.includes(host.url)) {
			hostOrder = this.sortOrder.indexOf(host.url) + 1;
		} else {
			hostOrder = this.sortOrder.length + 1;
			this.sortOrder.push(host.url);
		}

		const hotkey = document.createElement('div');
		hotkey.classList.add('name');
		if (process.platform === 'darwin') {
			hotkey.innerHTML = `⌘${ hostOrder }`;
		} else {
			hotkey.innerHTML = `^${ hostOrder }`;
		}

		const item = document.createElement('li');
		item.appendChild(initials);
		item.appendChild(tooltip);
		item.appendChild(badge);
		item.appendChild(img);
		item.appendChild(hotkey);

		item.dataset.host = host.url;
		item.dataset.sortOrder = hostOrder;
		item.setAttribute('server', host.url);
		item.classList.add('instance');

		item.setAttribute('draggable', true);

		item.ondragstart = (event) => {
			window.dragged = event.target.nodeName !== 'LI' ? event.target.closest('li') : event.target;
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.dropEffect = 'move';
			event.target.style.opacity = .5;
		};

		item.ondragover = (event) => {
			event.preventDefault();
		};

		item.ondragenter = (event) => {
			if (this.isBefore(window.dragged, event.target)) {
				event.currentTarget.parentNode.insertBefore(window.dragged, event.currentTarget);
			} else if (event.currentTarget !== event.currentTarget.parentNode.lastChild) {
				event.currentTarget.parentNode.insertBefore(window.dragged, event.currentTarget.nextSibling);
			} else {
				event.currentTarget.parentNode.appendChild(window.dragged);
			}
		};

		item.ondragend = (event) => {
			event.target.style.opacity = '';
		};

		item.ondrop = (event) => {
			event.preventDefault();

			const newSortOrder = [];
			Array.from(event.currentTarget.parentNode.children)
				.map((sideBarElement) => {
					const url = sideBarElement.dataset.host;
					newSortOrder.push(url);
					this.remove(url);

					return sideBarElement;
				})
				.forEach((sideBarElement) => {
					this.sortOrder = newSortOrder;
					localStorage.setItem(this.sortOrderKey, JSON.stringify(this.sortOrder));

					const url = sideBarElement.dataset.host;
					const host = { url, title: sideBarElement.querySelector('div.tooltip').innerHTML };
					this.add(host);
					this.setImage(url);
				});

			this.setActive(window.dragged.dataset.host);
		};

		item.onclick = () => {
			servers.setActive(host.url);
		};

		this.listElement.appendChild(item);
		this.emit('hosts-sorted');
	}

	setImage(hostUrl) {
		const img = this.getByUrl(hostUrl).querySelector('img');
		img.src = `${ hostUrl.replace(/\/$/, '') }/assets/favicon.svg?v=${ Math.round(Math.random() * 10000) }`;
	}

	remove(hostUrl) {
		const el = this.getByUrl(hostUrl);
		if (el) {
			el.remove();
		}
	}

	getByUrl(hostUrl) {
		return this.listElement.querySelector(`.instance[server="${ hostUrl }"]`);
	}

	getActive() {
		return this.listElement.querySelector('.instance.active');
	}

	isActive(hostUrl) {
		return !!this.listElement.querySelector(`.instance.active[server="${ hostUrl }"]`);
	}

	changeSidebarColor({ color, background }) {
		const sidebar = document.querySelector('.sidebar');
		if (sidebar) {
			sidebar.style.background = background;
			sidebar.style.color = color;
		}
	}

	setActive(hostUrl) {
		if (this.isActive(hostUrl)) {
			return;
		}

		this.deactiveAll();
		const item = this.getByUrl(hostUrl);
		if (item) {
			item.classList.add('active');
		}
		if (webview.getActive() && webview.getActive().classList.contains('ready')) {
			webview.getActive().send('request-sidebar-color');
		}
	}

	deactiveAll() {
		let item;
		while (!(item = this.getActive()) === false) {
			item.classList.remove('active');
		}
	}

	setLabel(hostUrl, label) {
		this.listElement.querySelector(`.instance[server="${ hostUrl }"] .tooltip`).innerHTML = label;
	}

	setBadge(hostUrl, badge) {
		const item = this.getByUrl(hostUrl);
		const badgeEl = item.querySelector('.badge');

		if (badge !== null && badge !== undefined && badge !== '') {
			item.classList.add('unread');
			if (isNaN(parseInt(badge))) {
				badgeEl.innerHTML = '';
			} else {
				badgeEl.innerHTML = badge;
			}
		} else {
			badge = undefined;
			item.classList.remove('unread');
			badgeEl.innerHTML = '';
		}
		this.emit('badge-setted', hostUrl, badge);
	}

	getGlobalBadge() {
		let count = 0;
		let title = '';
		const instanceEls = this.listElement.querySelectorAll('li.instance');
		for (let i = instanceEls.length - 1; i >= 0; i--) {
			const instanceEl = instanceEls[i];
			const text = instanceEl.querySelector('.badge').innerHTML;
			if (!isNaN(parseInt(text))) {
				count += parseInt(text);
			}
			if (title === '' && instanceEl.classList.contains('unread') === true) {
				title = '•';
			}
		}
		if (count > 0) {
			title = count.toString();
		}
		return {
			count,
			title,
			showAlert: (title !== ''),
		};
	}

	hide() {
		document.querySelector('.sidebar').classList.add('sidebar--hidden');
		localStorage.setItem('sidebar-closed', 'true');
		this.emit('hide');
		if (process.platform === 'darwin') {
			document.querySelectorAll('webview').forEach(
				(webviewObj) => { if (webviewObj.insertCSS) { webviewObj.insertCSS('aside.side-nav{margin-top:15px;overflow:hidden; transition: margin .5s ease-in-out; } .sidebar{padding-top:10px;transition: margin .5s ease-in-out;}'); } });
		}
	}

	show() {
		document.querySelector('.sidebar').classList.remove('sidebar--hidden');
		localStorage.setItem('sidebar-closed', 'false');
		this.emit('show');
		if (process.platform === 'darwin') {
			document.querySelectorAll('webview').forEach(
				(webviewObj) => { if (webviewObj.insertCSS) { webviewObj.insertCSS('aside.side-nav{margin-top:0; overflow:hidden; transition: margin .5s ease-in-out;} .sidebar{padding-top:0;transition: margin .5s ease-in-out;}'); } });
		}
	}

	toggle() {
		if (this.isHidden()) {
			this.show();
		} else {
			this.hide();
		}
	}

	isHidden() {
		return localStorage.getItem('sidebar-closed') === 'true';
	}

	isBefore(a, b) {
		if (a.parentNode === b.parentNode) {
			for (let cur = a; cur; cur = cur.previousSibling) {
				if (cur === b) {
					return true;
				}
			}
		}
		return false;
	}
}

export default new SideBar();


let selectedInstance = null;
const instanceMenu = remote.Menu.buildFromTemplate([{
	label: i18n.__('Reload_server'),
	click() {
		webview.getByUrl(selectedInstance.dataset.host).reload();
	},
}, {
	label: i18n.__('Remove_server'),
	click() {
		servers.removeHost(selectedInstance.dataset.host);
	},
}, {
	label: i18n.__('Open DevTools'),
	click() {
		webview.getByUrl(selectedInstance.dataset.host).openDevTools();
	},
}]);

window.addEventListener('contextmenu', function(e) {
	if (e.target.classList.contains('instance') || e.target.parentNode.classList.contains('instance')) {
		e.preventDefault();
		if (e.target.classList.contains('instance')) {
			selectedInstance = e.target;
		} else {
			selectedInstance = e.target.parentNode;
		}

		instanceMenu.popup(remote.getCurrentWindow());
	}
}, false);

if (process.platform === 'darwin') {
	window.addEventListener('keydown', function(e) {
		if (e.key === 'Meta') {
			document.getElementsByClassName('sidebar')[0].classList.add('command-pressed');
		}
	});

	window.addEventListener('keyup', function(e) {
		if (e.key === 'Meta') {
			document.getElementsByClassName('sidebar')[0].classList.remove('command-pressed');
		}
	});
} else {
	window.addEventListener('keydown', function(e) {
		if (e.key === 'ctrlKey') {
			document.getElementsByClassName('sidebar')[0].classList.add('command-pressed');
		}
	});

	window.addEventListener('keyup', function(e) {
		if (e.key === 'ctrlKey') {
			document.getElementsByClassName('sidebar')[0].classList.remove('command-pressed');
		}
	});
}
