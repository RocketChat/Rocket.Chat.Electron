import { parse as parseUrl } from 'url';

import { remote } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';

import {
	SIDE_BAR_SERVER_SELECTED,
	SIDE_BAR_RELOAD_SERVER_CLICKED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
	SIDE_BAR_SERVERS_SORTED,
	WEBVIEW_FAVICON_CHANGED,
} from '../scripts/actions';

function ServerButton({
	url,
	title,
	order,
	active,
	hasUnreadMessages,
	mentionCount,
	dispatch,
	subscribe,
}) {
	const [serverListRoot] = useState(() => document.querySelector('.sidebar .sidebar__server-list'));
	const { t } = useTranslation();

	const [favicon, setFavicon] = useState();

	useEffect(() => {
		const handleServerClick = (url) => {
			dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
		};

		const handleServerContextMenu = (url, event) => {
			event.preventDefault();

			const menu = remote.Menu.buildFromTemplate([
				{
					label: t('sidebar.item.reload'),
					click: () => dispatch({ type: SIDE_BAR_RELOAD_SERVER_CLICKED, payload: url }),
				},
				{
					label: t('sidebar.item.remove'),
					click: () => dispatch({ type: SIDE_BAR_REMOVE_SERVER_CLICKED, payload: url }),
				},
				{
					label: t('sidebar.item.openDevTools'),
					click: () => dispatch({ type: SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, payload: url }),
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

			dispatch({ type: SIDE_BAR_SERVERS_SORTED, payload: newSorting });
			dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: serverElement.dataset.url });
		};

		const initials = title
			.replace(url, parseUrl(url).hostname)
			.split(/[^A-Za-z0-9]+/g)
			.slice(0, 2)
			.map((text) => text.slice(0, 1).toUpperCase())
			.join('');

		const node = document.querySelector(`.sidebar .server[data-url="${ url }"]`);
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
		if (favicon) {
			faviconElement.src = favicon;
		} else {
			faviconElement.removeAttribute('src');
		}

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
	});

	useEffect(() => () => {
		const serverElement = document.querySelector(`.sidebar .sidebar__server-list .server[data-url='${ url }']`);
		serverElement.remove();
	}, []);

	useEffect(() => {
		const handleActionDispatched = ({ type, payload }) => {
			switch (type) {
				case WEBVIEW_FAVICON_CHANGED: {
					const { url: _url, favicon } = payload;
					if (url !== _url) {
						return;
					}

					setFavicon(favicon);
					break;
				}
			}
		};

		return subscribe(handleActionDispatched);
	}, []);

	return null;
}

export function SideBar({
	servers = [],
	currentServerUrl = null,
	badges = {},
	styles = {},
	visible = false,
	dispatch,
	subscribe,
}) {
	const { t } = useTranslation();
	const [root] = useState(() => document.querySelector('.sidebar'));
	const [serverListRoot] = useState(() => document.querySelector('.sidebar .sidebar__server-list'));

	const [showShortcuts, setShowShortcuts] = useState(false);

	useEffect(() => {
		root.classList.toggle('sidebar--macos', process.platform === 'darwin');

		// TODO: use globalShortcut and mainWindow focus
		window.onkeydown = (event) => {
			const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';
			if (event.key === shortcutKey) {
				setShowShortcuts(true);
			}
		};

		window.onkeyup = (event) => {
			const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';
			if (event.key === shortcutKey) {
				setShowShortcuts(false);
			}
		};

		root.querySelector('.sidebar__add-server').onclick = () => {
			dispatch({ type: SIDE_BAR_ADD_NEW_SERVER_CLICKED });
		};
	}, [dispatch]);

	useEffect(() => {
		root.classList.toggle('sidebar--hidden', !visible);
		serverListRoot.classList.toggle('sidebar__server-list--shortcuts', showShortcuts);

		const style = styles[currentServerUrl] || {};
		root.style.setProperty('--background', style.background || '');
		root.style.setProperty('--color', style.color || '');

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

	return <>
		{servers.map((server, order) => <ServerButton
			key={server.url}
			url={server.url}
			title={server.title}
			order={order}
			active={currentServerUrl === server.url}
			hasUnreadMessages={!!badges[server.url]}
			mentionCount={badges[server.url] || badges[server.url] === 0 ? parseInt(badges[server.url], 10) : null}
			dispatch={dispatch}
			subscribe={subscribe}
		/>)}
	</>;
}
