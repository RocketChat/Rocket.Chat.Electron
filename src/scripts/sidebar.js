import { remote } from 'electron';
import { EventEmitter } from 'events';
import i18n from '../i18n';
const { getCurrentWindow, Menu } = remote;


class SideBar extends EventEmitter {
	constructor() {
		super();

		// TODO: use globalShortcut and mainWindow focus
		window.addEventListener('keydown', this.handleShortcutsKey.bind(this, true));
		window.addEventListener('keyup', this.handleShortcutsKey.bind(this, false));

		document.querySelector('.add-server .tooltip').innerHTML = i18n.__('sidebar.addNewServer');
		document.querySelector('.add-server').addEventListener('click', this.handleAddServerClick.bind(this), false);

		this.sortOrder = JSON.parse(localStorage.getItem(this.sortOrderKey)) || [];
		localStorage.setItem(this.sortOrderKey, JSON.stringify(this.sortOrder));

		this.listElement = document.getElementById('sidebar__servers');
	}

	handleShortcutsKey(down, event) {
		const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'ctrlKey';
		if (event.key === shortcutKey) {
			document.querySelector('.sidebar').classList[down ? 'add' : 'remove']('command-pressed');
		}
	}

	handleServerClick(hostUrl) {
		this.emit('select-server', hostUrl);
	}

	handleServerContextMenu(hostUrl, event) {
		event.preventDefault();

		const menu = Menu.buildFromTemplate([
			{
				label: i18n.__('sidebar.item.reload'),
				click: () => this.emit('reload-server', hostUrl),
			},
			{
				label: i18n.__('sidebar.item.remove'),
				click: () => this.emit('remove-server', hostUrl),
			},
			{
				label: i18n.__('sidebar.item.openDevTools'),
				click: () => this.emit('open-devtools-for-server', hostUrl),
			},
		]);
		menu.popup(getCurrentWindow());
	}

	handleAddServerClick() {
		this.emit('add-server');
	}

	setHosts(hosts) {
		Object.values(hosts)
			.sort(({ url: a, url: b }) => this.sortOrder.indexOf(a) - this.sortOrder.indexOf(b))
			.forEach((host) => this.add(host));
	}

	get sortOrderKey() {
		return 'rocket.chat.sortOrder';
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

		const shortcut = document.createElement('div');
		shortcut.classList.add('name');
		if (process.platform === 'darwin') {
			shortcut.innerHTML = `⌘${ hostOrder }`;
		} else {
			shortcut.innerHTML = `^${ hostOrder }`;
		}

		const item = document.createElement('li');
		item.appendChild(initials);
		item.appendChild(tooltip);
		item.appendChild(badge);
		item.appendChild(img);
		item.appendChild(shortcut);

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

			this.emit('select-server', window.dragged.dataset.host);
		};

		item.addEventListener('click', this.handleServerClick.bind(this, host.url), false);
		item.addEventListener('contextmenu', this.handleServerContextMenu.bind(this, host.url), false);

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

	setVisible(visible) {
		document.querySelector('.sidebar').classList[visible ? 'remove' : 'add']('sidebar--hidden');
	}
}

export default new SideBar();
