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
	isDragging,
	...props
}) {
	const dispatch = useDispatch();
	const { t } = useTranslation();

	const [favicon, setFavicon] = useState();
	const [faviconLoaded, setFaviconLoaded] = useState(false);

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
			isDragging && 'server--dragged',
		].filter(Boolean).join(' ')}
		draggable='true'
		data-url={url}
		data-tooltip={title}
		onClick={handleServerClick.bind(null, url)}
		onContextMenu={handleServerContextMenu.bind(null, url)}
		onDragOver={(event) => event.preventDefault()}
		{...props}
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

	const [draggedServerUrl, setDraggedServerUrl] = useState(null);
	const [serversSorting, setServersSorting] = useState(null);

	const handleDragStart = (url) => (event) => {
		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
		setDraggedServerUrl(url);
		setServersSorting(servers.map(({ url }) => url));
	};

	const handleDragEnd = () => () => {
		setDraggedServerUrl(null);
		setServersSorting(null);
	};

	const handleDragEnter = (targetServerUrl) => () => {
		setServersSorting((serversSorting) => serversSorting.map((url) => {
			if (url === targetServerUrl) {
				return draggedServerUrl;
			}

			if (url === draggedServerUrl) {
				return targetServerUrl;
			}

			return url;
		}));
	};

	const handleDrop = (url) => (event) => {
		event.preventDefault();

		dispatch({ type: SIDE_BAR_SERVERS_SORTED, payload: serversSorting });
		dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
	};

	const sortedServers = serversSorting
		? servers.sort(({ url: a }, { url: b }) => serversSorting.indexOf(a) - serversSorting.indexOf(b))
		: servers;

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
				{sortedServers.map((server, order) => <ServerButton
					key={server.url}
					url={server.url}
					title={servers.title === 'Rocket.Chat' && parseUrl(server.url).host !== 'open.rocket.chat'
						? `${ server.title } - ${ server.url }`
						: server.title}
					order={order}
					active={currentServerUrl === server.url}
					hasUnreadMessages={!!badges[server.url]}
					mentionCount={badges[server.url] || badges[server.url] === 0 ? parseInt(badges[server.url], 10) : null}
					isDragging={draggedServerUrl === server.url}
					onDragStart={handleDragStart(server.url)}
					onDragEnd={handleDragEnd(server.url)}
					onDragEnter={handleDragEnter(server.url)}
					onDrop={handleDrop(server.url)}
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
