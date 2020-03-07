import { remote } from 'electron';
import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import {
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_DISABLE_GPU,
} from '../../actions';
import { Menu } from '../electron/Menu';
import { MenuItem } from '../electron/MenuItem';

export const AppMenu = forwardRef(function AppMenu(_, ref) {
	const appName = remote.app.name;
	const { t } = useTranslation();
	const dispatch = useDispatch();

	return <MenuItem ref={ref} label={process.platform === 'darwin' ? appName : t('menus.fileMenu')}>
		<Menu>
			{process.platform === 'darwin' && <>
				<MenuItem
					label={t('menus.about', { appName })}
					onClick={() => dispatch({ type: MENU_BAR_ABOUT_CLICKED })}
				/>
				<MenuItem type='separator' />
				<MenuItem
					label={t('menus.services')}
					role='services'
				/>
				<MenuItem type='separator' />
				<MenuItem
					label={t('menus.hide', { appName })}
					role='hide'
				/>
				<MenuItem
					label={t('menus.hideOthers')}
					role='hideothers'
				/>
				<MenuItem
					label={t('menus.unhide')}
					role='unhide'
				/>
				<MenuItem type='separator' />
			</>}
			{process.platform !== 'darwin' && <>
				<MenuItem
					label={t('menus.addNewServer')}
					accelerator={'CommandOrControl+N'}
					onClick={() => dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED })}
				/>
				<MenuItem type='separator' />
			</>}
			<MenuItem
				label={t('Disable GPU')}
				enabled={!remote.app.commandLine.hasSwitch('disable-gpu')}
				onClick={() => dispatch({ type: MENU_BAR_DISABLE_GPU })}
			/>
			<MenuItem type='separator' />
			<MenuItem
				label={t('menus.quit', { appName })}
				accelerator={'CommandOrControl+Q'}
				onClick={() => dispatch({ type: MENU_BAR_QUIT_CLICKED })}
			/>
		</Menu>
	</MenuItem>;
});
