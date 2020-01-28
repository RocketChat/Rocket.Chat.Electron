import { parse as parseUrl } from 'url';

import { remote } from 'electron';
import { t } from 'i18next';
import { useEffect, useState } from 'react';

import {
	SIDEBAR_SERVER_SELECTED,
	SIDEBAR_RELOAD_SERVER_CLICKED,
	SIDEBAR_REMOVE_SERVER_CLICKED,
	SIDEBAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	SIDEBAR_ADD_NEW_SERVER_CLICKED,
	SIDEBAR_SERVERS_SORTED,
} from './actions';

const faviconCacheBustingTime = 15 * 60 * 1000;

let root;
let serverListRoot;

const renderHost = ({ url, title, order, active, hasUnreadMessages, mentionCount, dispatch }) => {
	const handleServerClick = (url) => {
		dispatch({ type: SIDEBAR_SERVER_SELECTED, payload: url });
	};

	const handleServerContextMenu = (url, event) => {
		event.preventDefault();

		const menu = remote.Menu.buildFromTemplate([
			{
				label: t('sidebar.item.reload'),
				click: () => dispatch({ type: SIDEBAR_RELOAD_SERVER_CLICKED, payload: url }),
			},
			{
				label: t('sidebar.item.remove'),
				click: () => dispatch({ type: SIDEBAR_REMOVE_SERVER_CLICKED, payload: url }),
			},
			{
				label: t('sidebar.item.openDevTools'),
				click: () => dispatch({ type: SIDEBAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, payload: url }),
			},
		]);
		menu.popup(remote.getCurrentWindow());
	};

	const handleDragStart = (event) => {
		const serverElement = event.currentTarget;
		serverElement.classList.add('server--dragged');

		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
	};

	const handleDragEnd = (event) => {
		const serverElement = event.currentTarget;
		serverElement.classList.remove('server--dragged');
	};

	const handleDragEnter = (event) => {
		const draggedServerElement = serverListRoot.querySelector('.server--dragged');
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
			serverListRoot.insertBefore(draggedServerElement, targetServerElement);
		} else if (targetServerElement !== serverListRoot.lastChild) {
			serverListRoot.insertBefore(draggedServerElement, targetServerElement.nextSibling);
		} else {
			serverListRoot.appendChild(draggedServerElement);
		}
	};

	const handleDrop = (event) => {
		event.preventDefault();

		const serverElement = event.currentTarget;

		const newSorting = Array.from(serverListRoot.querySelectorAll('.server'))
			.map((serverElement) => serverElement.dataset.url);

		dispatch({ type: SIDEBAR_SERVERS_SORTED, payload: newSorting });
		dispatch({ type: SIDEBAR_SERVER_SELECTED, payload: serverElement.dataset.url });
	};

	const initials = 			title
		.replace(url, parseUrl(url).hostname)
		.split(/[^A-Za-z0-9]+/g)
		.slice(0, 2)
		.map((text) => text.slice(0, 1).toUpperCase())
		.join('');
	const bustingParam = Math.round(Date.now() / faviconCacheBustingTime);
	const faviconUrl = `${ url.replace(/\/$/, '') }/assets/favicon.svg?_=${ bustingParam }`;

	const node = root.querySelector(`.server[data-url="${ url }"]`);
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
	serverElement.onclick = handleServerClick.bind(null, url);
	serverElement.oncontextmenu = handleServerContextMenu.bind(null, url);
	serverElement.ondragstart = handleDragStart;
	serverElement.ondragend = handleDragEnd;
	serverElement.ondragenter = handleDragEnter;
	serverElement.ondragover = (event) => event.preventDefault();
	serverElement.ondrop = handleDrop;

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

	const shouldAppend = !node || order !== Array.from(serverListRoot.children).indexOf(serverElement);

	if (shouldAppend) {
		serverListRoot.appendChild(serverElement);
	}
};

export function SideBar({
	servers = [],
	currentServerUrl = null,
	badges = {},
	styles = {},
	visible = false,
	dispatch,
}) {
	const [showShortcuts, setShowShortcuts] = useState(false);

	useEffect(() => {
		root = document.querySelector('.sidebar');
		root.classList.toggle('sidebar--macos', process.platform === 'darwin');

		// TODO: use globalShortcut and mainWindow focus
		window.addEventListener('keydown', (event) => {
			const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';
			if (event.key === shortcutKey) {
				setShowShortcuts(true);
			}
		});
		window.addEventListener('keyup', (event) => {
			const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';
			if (event.key === shortcutKey) {
				setShowShortcuts(false);
			}
		});

		root.querySelector('.sidebar__add-server').addEventListener('click', () => {
			dispatch({ type: SIDEBAR_ADD_NEW_SERVER_CLICKED });
		}, false);

		serverListRoot = root.querySelector('.sidebar__server-list');
	}, [dispatch]);

	useEffect(() => {
		root.classList.toggle('sidebar--hidden', !visible);
		serverListRoot.classList.toggle('sidebar__server-list--shortcuts', showShortcuts);

		const style = styles[currentServerUrl] || {};
		root.style.setProperty('--background', style.background || '');
		root.style.setProperty('--color', style.color || '');

		const hostUrls = servers.map(({ url }) => url);
		Array.from(serverListRoot.querySelectorAll('.server'))
			.filter((serverElement) => !hostUrls.includes(serverElement.dataset.url))
			.forEach((serverElement) => serverElement.remove());

		servers.forEach((host, order) => renderHost({
			...host,
			order,
			active: currentServerUrl === host.url,
			hasUnreadMessages: !!badges[host.url],
			mentionCount: badges[host.url] || badges[host.url] === 0 ? parseInt(badges[host.url], 10) : null,
			dispatch,
		}));

		root.querySelector('.sidebar__add-server').dataset.tooltip = t('sidebar.addNewServer');
	}, [
		servers,
		currentServerUrl,
		visible,
		badges,
		styles,
		showShortcuts,
		dispatch,
	]);

	return null;
}
