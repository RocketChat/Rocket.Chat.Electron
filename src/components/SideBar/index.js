import { parse as parseUrl } from 'url';

import { ipcRenderer } from 'electron';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import {
	SIDE_BAR_SERVER_SELECTED,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
} from '../../actions';
import { EVENT_SIDEBAR_CONTEXT_MENU_TRIGGERED } from '../../ipc';
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

function ServerButton({
	url,
	title,
	shortcutNumber,
	isSelected,
	favicon,
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

	const handleServerClick = () => {
		dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
	};

	const initials = useMemo(() => title
		.replace(url, parseUrl(url).hostname)
		.split(/[^A-Za-z0-9]+/g)
		.slice(0, 2)
		.map((text) => text.slice(0, 1).toUpperCase())
		.join(''), [title, url]);

	const handleServerContextMenu = (event) => {
		event.preventDefault();
		ipcRenderer.send(EVENT_SIDEBAR_CONTEXT_MENU_TRIGGERED, url);
	};

	return <ServerButtonWrapper
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
			<Initials visible={!favicon}>
				{initials}
			</Initials>
			<Favicon
				draggable='false'
				src={favicon ?? ''}
				visible={!!favicon}
			/>
		</Avatar>
		{Number.isInteger(badge) && <Badge>{String(badge)}</Badge>}
		{shortcutNumber && <KeyboardShortcut visible={isShortcutVisible}>
			{process.platform === 'darwin' ? '⌘' : '^'}{shortcutNumber}
		</KeyboardShortcut>}
	</ServerButtonWrapper>;
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
