import { EventEmitter } from 'events';
import { parse as parseUrl } from 'url';

import { remote } from 'electron';

import i18n from '../i18n';


const { getCurrentWindow, Menu } = remote;


const faviconCacheBustingTime = 15 * 60 * 1000;

class SideBar extends EventEmitter {
	constructor() {
		super();

		this.state = {
			hosts: {},
			sorting: [],
			active: null,
			badges: {},
			styles: {},
			showShortcuts: false,
			visible: false,
		};
	}

	setState(partialState) {
		this.state = {
			...this.state,
			...partialState,
		};

		if (this.node) {
			this.render();
		}
	}

	mount() {
		this.node = document.querySelector('.sidebar');
		this.node.classList.toggle('sidebar--macos', process.platform === 'darwin');

		// TODO: use globalShortcut and mainWindow focus
		window.addEventListener('keydown', this.handleShortcutsKey.bind(this, true));
		window.addEventListener('keyup', this.handleShortcutsKey.bind(this, false));

		this.node.querySelector('.sidebar__add-server').addEventListener('click', this.handleAddServerClick.bind(this), false);

		this.serverListElement = this.node.querySelector('.sidebar__server-list');

		this.render();
	}

	render() {
		const {
			hosts,
			sorting,
			active,
			badges,
			styles,
			showShortcuts,
			visible,
		} = this.state;

		this.node.classList.toggle('sidebar--hidden', !visible);
		this.serverListElement.classList.toggle('sidebar__server-list--shortcuts', showShortcuts);

		const style = styles[active] || {};
		this.node.style.setProperty('--background', style.background || '');
		this.node.style.setProperty('--color', style.color || '');

		const orderedHosts = Object.values(hosts)
			.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b));

		const hostUrls = orderedHosts.map(({ url }) => url);
		Array.from(this.serverListElement.querySelectorAll('.server'))
			.filter((serverElement) => !hostUrls.includes(serverElement.dataset.url))
			.forEach((serverElement) => serverElement.remove());

		orderedHosts.forEach((host, order) => this.renderHost({
			...host,
			order,
			active: active === host.url,
			hasUnreadMessages: !!badges[host.url],
			mentionCount: badges[host.url] || badges[host.url] === 0 ? parseInt(badges[host.url], 10) : null,
		}));

		this.node.querySelector('.sidebar__add-server').dataset.tooltip = i18n.__('sidebar.addNewServer');
	}

	renderHost({ url, title, order, active, hasUnreadMessages, mentionCount }) {
		const initials = 			title
			.replace(url, parseUrl(url).hostname)
			.split(/[^A-Za-z0-9]+/g)
			.slice(0, 2)
			.map((text) => text.slice(0, 1).toUpperCase())
			.join('');
		const bustingParam = Math.round(Date.now() / faviconCacheBustingTime);
		const faviconUrl = `${ url.replace(/\/$/, '') }/assets/favicon.svg?_=${ bustingParam }`;

		const node = this.node.querySelector(`.server[data-url="${ url }"]`);
		const serverElement = node || document.createElement('li');
		const initialsElement = node ? node.querySelector('.server__initials') : document.createElement('span');
		const faviconElement = node ? node.querySelector('.server__favicon') : document.createElement('img');
		const badgeElement = node ? node.querySelector('.server__badge') : document.createElement('div');
		const shortcutElement = node ? node.querySelector('.server__shortcut') : document.createElement('div');

		serverElement.setAttribute('draggable', 'true');
		serverElement.dataset.url = url;
		serverElement.dataset.tooltip = title;
		serverElement.classList.add('sidebar__list-item');
		serverElement.classList.add('server');
		serverElement.classList.toggle('server--active', active);
		serverElement.classList.toggle('server--unread', hasUnreadMessages);
		serverElement.onclick = this.handleServerClick.bind(this, url);
		serverElement.oncontextmenu = this.handleServerContextMenu.bind(this, url);
		serverElement.ondragstart = this.handleDragStart.bind(this);
		serverElement.ondragend = this.handleDragEnd.bind(this);
		serverElement.ondragenter = this.handleDragEnter.bind(this);
		serverElement.ondragover = this.handleDragOver.bind(this);
		serverElement.ondrop = this.handleDrop.bind(this);

		initialsElement.classList.add('server__initials');
		initialsElement.innerText = initials;

		faviconElement.setAttribute('draggable', 'false');
		faviconElement.classList.add('server__favicon');
		faviconElement.onload = () => {
			serverElement.classList.add('server--with-favicon');
		};
		faviconElement.onerror = () => {
			serverElement.classList.remove('server--with-favicon');
		};
		faviconElement.src = faviconUrl;

		badgeElement.classList.add('server__badge');
		badgeElement.innerText = Number.isInteger(mentionCount) ? String(mentionCount) : '';

		shortcutElement.classList.add('server__shortcut');
		shortcutElement.innerText = `${ process.platform === 'darwin' ? '⌘' : '^' }${ order + 1 }`;

		if (!node) {
			serverElement.appendChild(initialsElement);
			serverElement.appendChild(faviconElement);
			serverElement.appendChild(badgeElement);
			serverElement.appendChild(shortcutElement);
		}

		const shouldAppend = !node || order !== Array.from(this.serverListElement.children).indexOf(serverElement);

		if (shouldAppend) {
			this.serverListElement.appendChild(serverElement);
		}
	}

	handleShortcutsKey(down, event) {
		const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';
		if (event.key === shortcutKey) {
			this.setState({ showShortcuts: down });
		}
	}

	handleServerClick(url) {
		this.emit('select-server', url);
	}

	handleServerContextMenu(url, event) {
		event.preventDefault();

		const menu = Menu.buildFromTemplate([
			{
				label: i18n.__('sidebar.item.reload'),
				click: () => this.emit('reload-server', url),
			},
			{
				label: i18n.__('sidebar.item.remove'),
				click: () => this.emit('remove-server', url),
			},
			{
				label: i18n.__('sidebar.item.openDevTools'),
				click: () => this.emit('open-devtools-for-server', url),
			},
		]);
		menu.popup(getCurrentWindow());
	}

	handleDragStart(event) {
		const serverElement = event.currentTarget;
		serverElement.classList.add('server--dragged');

		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
	}

	handleDragEnd(event) {
		const serverElement = event.currentTarget;
		serverElement.classList.remove('server--dragged');
	}

	handleDragEnter(event) {
		const draggedServerElement = this.serverListElement.querySelector('.server--dragged');
		const targetServerElement = event.currentTarget;

		const isTargetBeforeDragged = (() => {
			for (let current = draggedServerElement; current; current = current.previousSibling) {
				if (current === targetServerElement) {
					return true;
				}
			}

			return false;
		})();

		if (isTargetBeforeDragged) {
			this.serverListElement.insertBefore(draggedServerElement, targetServerElement);
		} else if (targetServerElement !== this.serverListElement.lastChild) {
			this.serverListElement.insertBefore(draggedServerElement, targetServerElement.nextSibling);
		} else {
			this.serverListElement.appendChild(draggedServerElement);
		}
	}

	handleDragOver(event) {
		event.preventDefault();
	}

	handleDrop(event) {
		event.preventDefault();

		const serverElement = event.currentTarget;

		const newSorting = Array.from(this.serverListElement.querySelectorAll('.server'))
			.map((serverElement) => serverElement.dataset.url);

		this.emit('servers-sorted', newSorting);
		this.emit('select-server', serverElement.dataset.url);
	}

	handleAddServerClick() {
		this.emit('add-server');
	}
}

export default new SideBar();
