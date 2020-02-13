import { remote } from 'electron';
import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { MenuItem } from '../electron/MenuItem';
import { Menu } from '../electron/Menu';
import {
	MENU_BAR_OPEN_URL_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_RELOAD_APP_CLICKED,
	MENU_BAR_TOGGLE_DEVTOOLS_CLICKED,
} from '../../actions';

export const HelpMenu = forwardRef(function HelpMenu(_, ref) {
	const { t } = useTranslation();
	const dispatch = useDispatch();
	const appName = remote.app.name;

	return <MenuItem ref={ref} label={t('menus.helpMenu')} role='help'>
		<Menu>
			<MenuItem
				label={t('menus.documentation')}
				onClick={() => dispatch({ type: MENU_BAR_OPEN_URL_CLICKED, payload: 'https://rocket.chat/docs' })}
			/>
			<MenuItem
				label={t('menus.reportIssue')}
				onClick={() => dispatch({ type: MENU_BAR_OPEN_URL_CLICKED, payload: 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new' })}
			/>
			<MenuItem type='separator' />
			<MenuItem
				label={t('menus.reload')}
				accelerator='CommandOrControl+Shift+R'
				onClick={() => dispatch({ type: MENU_BAR_RELOAD_APP_CLICKED })}
			/>
			<MenuItem
				label={t('menus.toggleDevTools')}
				onClick={() => dispatch({ type: MENU_BAR_TOGGLE_DEVTOOLS_CLICKED })}
			/>
			<MenuItem type='separator' />
			<MenuItem
				label={t('menus.clearTrustedCertificates')}
				onClick={() => dispatch({ type: MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED })}
			/>
			<MenuItem
				label={t('menus.resetAppData')}
				onClick={() => dispatch({ type: MENU_BAR_RESET_APP_DATA_CLICKED })}
			/>
			<MenuItem type='separator' />
			<MenuItem
				label={t('menus.learnMore')}
				onClick={() => dispatch({ type: MENU_BAR_OPEN_URL_CLICKED, payload: 'https://rocket.chat' })}
			/>
			{process.platform !== 'darwin' && <>
				<MenuItem
					label={t('menus.about', { appName })}
					onClick={() => dispatch({ type: MENU_BAR_ABOUT_CLICKED })}
				/>
			</>}
		</Menu>
	</MenuItem>;
});
