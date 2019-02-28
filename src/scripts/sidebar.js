import { remote } from 'electron';
import { EventEmitter } from 'events';
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

		// TODO: use globalShortcut and mainWindow focus
		window.addEventListener('keydown', this.handleShortcutsKey.bind(this, true));
		window.addEventListener('keyup', this.handleShortcutsKey.bind(this, false));

		this.node.querySelector('.add-server').addEventListener('click', this.handleAddServerClick.bind(this), false);

		this.serverListElement = this.node.querySelector('.server-list');

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

		this.node.classList.toggle('sidebar--shortcuts', showShortcuts);
		this.node.classList.toggle('sidebar--hidden', !visible);

		const style = styles[active] || {};
		this.node.style.background = style.background || '';
		this.node.style.color = style.color || '';

		const orderedHosts = Object.values(hosts)
			.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b));

		const hostUrls = orderedHosts.map(({ url }) => url);
		Array.from(this.serverListElement.querySelectorAll('.server'))
			.filter((serverElement) => !hostUrls.includes(serverElement.dataset.host))
			.forEach((serverElement) => serverElement.remove());

		orderedHosts.forEach((host, order) => this.renderHost({
			...host,
			order,
			active: active === host.url,
			hasUnreadMessages: !!badges[host.url],
			mentionCount: (badges[host.url] || badges[host.url] === 0) ? parseInt(badges[host.url], 10) : null,
		}));

		this.node.querySelector('.add-server .tooltip').innerText = i18n.__('sidebar.addNewServer');
	}

	renderHost({ url, title, order, active, hasUnreadMessages, mentionCount }) {
		let name = title.replace(/^https?:\/\/(?:www\.)?([^\/]+)(.*)/, '$1').split('.');
		name = (name[0][0] + (name[1] ? name[1][0] : '')).toUpperCase();

		const bustingParam = Math.round(Date.now() / faviconCacheBustingTime);
		const faviconUrl = `${ url.replace(/\/$/, '') }/assets/favicon.svg?_=${ bustingParam }`;

		const node = this.node.querySelector(`.server[data-url="${ url }"]`);
		const serverElement = node ? node : document.createElement('li');
		const initialsElement = node ? node.querySelector('.initials') : document.createElement('span');
		const tooltipElement = node ? node.querySelector('.tooltip') : document.createElement('div');
		const badgeElement = node ? node.querySelector('.badge') : document.createElement('div');
		const faviconElement = node ? node.querySelector('img') : document.createElement('img');
		const shortcutElement = node ? node.querySelector('.name') : document.createElement('div');

		serverElement.setAttribute('draggable', 'true');
		serverElement.setAttribute('server', url);
		serverElement.dataset.url = url;
		serverElement.dataset.host = url;
		serverElement.dataset.sortOrder = order + 1;
		serverElement.classList.add('server');
		serverElement.classList.add('instance');
		serverElement.classList.toggle('active', active);
		serverElement.classList.toggle('unread', hasUnreadMessages);
		serverElement.onclick = this.handleServerClick.bind(this, url);
		serverElement.oncontextmenu = this.handleServerContextMenu.bind(this, url);
		serverElement.ondragstart = this.handleDragStart.bind(this);
		serverElement.ondragend = this.handleDragEnd.bind(this);
		serverElement.ondragenter = this.handleDragEnter.bind(this);
		serverElement.ondragover = this.handleDragOver.bind(this);
		serverElement.ondrop = this.handleDrop.bind(this);

		initialsElement.classList.add('initials');
		initialsElement.innerText = name;

		tooltipElement.classList.add('tooltip');
		tooltipElement.innerText = title;

		badgeElement.classList.add('badge');
		badgeElement.innerText = Number.isInteger(mentionCount) ? String(mentionCount) : '',

		faviconElement.onload = () => {
			initialsElement.style.display = 'none';
			faviconElement.style.display = 'initial';
		};
		faviconElement.src = faviconUrl;

		shortcutElement.classList.add('name');
		shortcutElement.innerText = `${ process.platform === 'darwin' ? '⌘' : '^' }${ order + 1 }`;

		if (!node) {
			serverElement.appendChild(initialsElement);
			serverElement.appendChild(tooltipElement);
			serverElement.appendChild(badgeElement);
			serverElement.appendChild(faviconElement);
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
		serverElement.style.opacity = .5;

		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
	}

	handleDragEnd(event) {
		const serverElement = event.currentTarget;
		serverElement.classList.remove('server--dragged');
		serverElement.style.opacity = '';
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
			.reduce((sorting, serverElement) => [...sorting, serverElement.dataset.url], []);

		this.emit('servers-sorted', newSorting);
		this.emit('select-server', serverElement.dataset.host);
	}

	handleAddServerClick() {
		this.emit('add-server');
	}
}

export default new SideBar();
