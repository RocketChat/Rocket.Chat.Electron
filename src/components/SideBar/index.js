import { parse as parseUrl } from 'url';

import { remote } from 'electron';
import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import {
	SIDE_BAR_SERVER_SELECTED,
	SIDE_BAR_RELOAD_SERVER_CLICKED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
	WEBVIEW_FAVICON_CHANGED,
} from '../../actions';
import { useSaga } from '../SagaMiddlewareProvider';
import {
	AddServerButton,
	AddServerButtonLabel,
	Avatar,
	Badge,
	Content,
	Favicon,
	Initials,
	KeyboardShortcut,
	ServerButtonWrapper,
	ServerList,
	Wrapper,
} from './styles';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useSorting } from './useSorting';
import { Menu } from '../electron/Menu';
import { MenuItem } from '../electron/MenuItem';

function ServerButton({
	url,
	title,
	shortcutNumber,
	isSelected,
	favicon: initialFavicon,
	isShortcutVisible,
	hasUnreadMessages,
	badge,
	isDragged,
	onDragStart,
	onDragEnd,
	onDragEnter,
	onDrop,
}) {
	const dispatch = useDispatch();
	const { t } = useTranslation();

	const [favicon, setFavicon] = useState(initialFavicon);
	const [faviconLoaded, setFaviconLoaded] = useState(false);

	const handleServerClick = () => {
		dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
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

	const contextMenuRef = useRef();

	const handleServerContextMenu = (event) => {
		event.preventDefault();
		contextMenuRef.current.popup(remote.getCurrentWindow());
	};

	return <>
		<Menu ref={contextMenuRef}>
			<MenuItem
				label={t('sidebar.item.reload')}
				onClick={() => dispatch({ type: SIDE_BAR_RELOAD_SERVER_CLICKED, payload: url })}
			/>
			<MenuItem
				label={t('sidebar.item.remove')}
				onClick={() => dispatch({ type: SIDE_BAR_REMOVE_SERVER_CLICKED, payload: url })}
			/>
			<MenuItem type='separator' />
			<MenuItem
				label={t('sidebar.item.openDevTools')}
				onClick={() => dispatch({ type: SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, payload: url })}
			/>
		</Menu>
		<ServerButtonWrapper
			draggable='true'
			tooltip={title}
			isSelected={isSelected}
			isDragged={isDragged}
			hasUnreadMessages={hasUnreadMessages}
			onClick={handleServerClick}
			onContextMenu={handleServerContextMenu}
			onDragOver={(event) => event.preventDefault()}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onDragEnter={onDragEnter}
			onDrop={onDrop}
		>
			<Avatar isSelected={isSelected}>
				<Initials visible={!faviconLoaded}>
					{initials}
				</Initials>
				<Favicon
					draggable='false'
					src={favicon}
					visible={faviconLoaded}
					onLoad={() => setFaviconLoaded(true)}
					onError={() => setFaviconLoaded(false)}
				/>
			</Avatar>
			{Number.isInteger(badge) && <Badge>{String(badge)}</Badge>}
			{shortcutNumber && <KeyboardShortcut visible={isShortcutVisible}>
				{process.platform === 'darwin' ? '⌘' : '^'}{shortcutNumber}
			</KeyboardShortcut>}
		</ServerButtonWrapper>
	</>;
}

export function SideBar() {
	const isVisible = useSelector(({ servers, isSideBarEnabled }) => servers.length > 0 && isSideBarEnabled);
	const servers = useSelector(({ servers }) => servers);
	const currentServerUrl = useSelector(({ currentServerUrl }) => currentServerUrl);

	const {
		background,
		color,
	} = useSelector(({ servers }) => servers.find(({ url }) => url === currentServerUrl)?.style || {});

	const isEachShortcutVisible = useKeyboardShortcuts();
	const {
		sortedServers,
		draggedServerUrl,
		handleDragStart,
		handleDragEnd,
		handleDragEnter,
		handleDrop,
	} = useSorting(servers);

	const dispatch = useDispatch();

	const handleAddServerButtonClicked = () => {
		dispatch({ type: SIDE_BAR_ADD_NEW_SERVER_CLICKED });
	};

	const { t } = useTranslation();

	return <Wrapper background={background} color={color} isVisible={isVisible}>
		<Content withWindowButtons={process.platform === 'darwin'}>
			<ServerList>
				{sortedServers.map((server, order) => <ServerButton
					key={server.url}
					url={server.url}
					title={servers.title === 'Rocket.Chat' && parseUrl(server.url).host !== 'open.rocket.chat'
						? `${ server.title } - ${ server.url }`
						: server.title}
					shortcutNumber={order <= 9 ? String(order + 1) : undefined}
					isSelected={currentServerUrl === server.url}
					favicon={server.favicon}
					hasUnreadMessages={!!server.badge}
					badge={server.badge || server.badge === 0 ? parseInt(server.badge, 10) : null}
					isShortcutVisible={isEachShortcutVisible}
					isDragged={draggedServerUrl === server.url}
					onDragStart={handleDragStart(server.url)}
					onDragEnd={handleDragEnd}
					onDragEnter={handleDragEnter(server.url)}
					onDrop={handleDrop(server.url)}
				/>)}
			</ServerList>
			<AddServerButton>
				<AddServerButtonLabel
					tooltip={t('sidebar.addNewServer')}
					onClick={handleAddServerButtonClicked}
				>+</AddServerButtonLabel>
			</AddServerButton>
		</Content>
	</Wrapper>;
}
