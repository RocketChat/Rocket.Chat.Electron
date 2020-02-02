import { parse as parseUrl } from 'url';

import { remote } from 'electron';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import {
	SIDE_BAR_SERVER_SELECTED,
	SIDE_BAR_RELOAD_SERVER_CLICKED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
	SIDE_BAR_SERVERS_SORTED,
	WEBVIEW_FAVICON_CHANGED,
	WEBVIEW_SHORTCUT_KEY_DOWN,
	WEBVIEW_SHORTCUT_KEY_UP,
} from '../actions';
import { useSaga } from './SagaMiddlewareProvider';

function ServerButton({
	url,
	title,
	order,
	active,
	hasUnreadMessages,
	mentionCount,
}) {
	const dispatch = useDispatch();
	const { t } = useTranslation();

	const [favicon, setFavicon] = useState();
	const [faviconLoaded, setFaviconLoaded] = useState(false);
	const [dragged, setDragged] = useState(false);

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
		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
		setDragged(true);
	};

	const handleDragEnd = () => {
		setDragged(false);
	};

	const [serverListRoot] = useState(() => document.querySelector('.sidebar .sidebar__server-list'));

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

	const initials = useMemo(() => title
		.replace(url, parseUrl(url).hostname)
		.split(/[^A-Za-z0-9]+/g)
		.slice(0, 2)
		.map((text) => text.slice(0, 1).toUpperCase())
		.join(''), [title, url]);

	useSaga(function *() {
		yield takeEvery(WEBVIEW_FAVICON_CHANGED, function *({ payload: { url: _url, favicon } }) {
			if (url !== _url) {
				return;
			}

			setFavicon(favicon);
		});
	}, []);

	return <li
		className={[
			'sidebar__list-item',
			'server',
			active && 'server--active',
			hasUnreadMessages && 'server--unread',
			faviconLoaded && 'server--with-favicon',
			dragged && 'server--dragged',
		].filter(Boolean).join(' ')}
		draggable='true'
		data-url={url}
		data-tooltip={title}
		onClick={handleServerClick.bind(null, url)}
		onContextMenu={handleServerContextMenu.bind(null, url)}
		onDragStart={handleDragStart}
		onDragEnd={handleDragEnd}
		onDragEnter={handleDragEnter}
		onDragOver={(event) => event.preventDefault()}
		onDrop={handleDrop}
	>
		<span className='server__initials'>{initials}</span>
		<img
			className='server__favicon'
			draggable='false'
			src={favicon}
			onLoad={() => setFaviconLoaded(true)}
			onError={() => setFaviconLoaded(false)}
		/>
		<div className='server__badge'>
			{Number.isInteger(mentionCount) ? String(mentionCount) : ''}
		</div>
		<div className='server__shortcut'>
			{process.platform === 'darwin' ? '⌘' : '^'}{order + 1}
		</div>
	</li>;
}

export function SideBar({
	servers = [],
	currentServerUrl = null,
	badges = {},
	styles = {},
	visible = false,
}) {
	const dispatch = useDispatch();
	const { t } = useTranslation();

	const [showShortcuts, setShowShortcuts] = useState(false);

	useEffect(() => {
		const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

		const handleKeyDown = ({ key }) => {
			if (shortcutKey !== key) {
				return;
			}

			setShowShortcuts(true);
		};

		const handleKeyUp = ({ key }) => {
			if (shortcutKey !== key) {
				return;
			}

			setShowShortcuts(false);
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	useSaga(function *() {
		yield takeEvery(WEBVIEW_SHORTCUT_KEY_DOWN, function *() {
			setShowShortcuts(true);
		});

		yield takeEvery(WEBVIEW_SHORTCUT_KEY_UP, function *() {
			setShowShortcuts(false);
		});
	}, []);

	const {
		background,
		color,
	} = styles[currentServerUrl] || {};

	const handleAddServerButtonClicked = () => {
		dispatch({ type: SIDE_BAR_ADD_NEW_SERVER_CLICKED });
	};

	return <div
		className={[
			'sidebar',
			!visible && 'sidebar--hidden',
			process.platform === 'darwin' && 'sidebar--macos',
		].filter(Boolean).join(' ')}
		style={{
			'--background': background,
			'--color': color,
		}}
	>
		<div className='sidebar__inner'>
			<ol
				className={[
					'sidebar__list',
					'sidebar__server-list',
					showShortcuts && 'sidebar__server-list--shortcuts',
				].filter(Boolean).join(' ')}
			>
				{servers.map((server, order) => <ServerButton
					key={server.url}
					url={server.url}
					title={servers.title === 'Rocket.Chat' && parseUrl(server.url).host !== 'open.rocket.chat'
						? `${ server.title } - ${ server.url }`
						: server.title}
					order={order}
					active={currentServerUrl === server.url}
					hasUnreadMessages={!!badges[server.url]}
					mentionCount={badges[server.url] || badges[server.url] === 0 ? parseInt(badges[server.url], 10) : null}
				/>)}
			</ol>
			<button
				className='sidebar__action sidebar__add-server'
				data-tooltip={t('sidebar.addNewServer')}
				onClick={handleAddServerButtonClicked}
			>
				<span className='sidebar__action-label'>+</span>
			</button>
		</div>
	</div>;
}
