import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { MenuItem } from '../electron/MenuItem';
import { Menu } from '../electron/Menu';
import {
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
} from '../../actions';

export const WindowMenu = forwardRef(function WindowMenu(_, ref) {
	const servers = useSelector(({ servers }) => servers);
	const currentServerUrl = useSelector(({ currentServerUrl }) => currentServerUrl);
	const isShowWindowOnUnreadChangedEnabled = useSelector(({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled);
	const { t } = useTranslation();
	const dispatch = useDispatch();

	return <MenuItem ref={ref} label={t('menus.windowMenu')} role='window'>
		<Menu>
			{process.platform === 'darwin' && <>
				<MenuItem
					label={t('menus.addNewServer')}
					accelerator='CommandOrControl+N'
					onClick={() => dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED })}
				/>
				<MenuItem type='separator' />
			</>}
			{servers.length > 0 && <>
				{servers.map((server, i) => <MenuItem
					key={i}
					type={currentServerUrl ? 'checkbox' : 'normal'}
					label={server.title.replace(/&/g, '&&')}
					checked={currentServerUrl === server.url}
					accelerator={`CommandOrControl+${ i + 1 }`}
					onClick={() => dispatch({ type: MENU_BAR_SELECT_SERVER_CLICKED, payload: server })}
				/>)}
				<MenuItem type='separator' />
			</>}
			<MenuItem
				type='checkbox'
				label={t('menus.showOnUnreadMessage')}
				checked={isShowWindowOnUnreadChangedEnabled}
				onClick={({ checked }) => dispatch({ type: MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED, payload: checked })}
			/>
			<MenuItem type='separator' />
			<MenuItem
				role='minimize'
				label={t('menus.minimize')}
				accelerator='CommandOrControl+M'
			/>
			<MenuItem
				role='close'
				label={t('menus.close')}
				accelerator='CommandOrControl+W'
			/>
		</Menu>
	</MenuItem>;
});
