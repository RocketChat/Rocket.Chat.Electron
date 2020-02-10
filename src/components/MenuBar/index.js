import { remote } from 'electron';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import {
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_OPEN_URL_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_RELOAD_APP_CLICKED,
	MENU_BAR_TOGGLE_DEVTOOLS_CLICKED,
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_TOGGLE_SETTING_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
} from '../../actions';
import { MenuItem } from './MenuItem';
import { Menu } from './Menu';

export function MenuBar({
	appName = remote.app.name,
	showFullScreen,
	showServerList,
	showTrayIcon,
	showMenuBar,
	servers = [],
	currentServerUrl,
	showWindowOnUnreadChanged,
}) {
	const dispatch = useDispatch();
	const { t } = useTranslation();

	useEffect(() => () => {
		remote.Menu.setApplicationMenu(null);
	}, []);

	useEffect(() => {
		if (process.platform === 'darwin') {
			return;
		}

		remote.getCurrentWindow().autoHideMenuBar = !showMenuBar;
		remote.getCurrentWindow().setMenuBarVisibility(!!showMenuBar);
	}, [showMenuBar]);


	const menuRef = useRef();
	const prevMenuRef = useRef();
	useEffect(() => {
		if (prevMenuRef.current === menuRef.current) {
			return;
		}

		remote.Menu.setApplicationMenu(menuRef.current);
		prevMenuRef.current = menuRef.current;
	});

	return <Menu ref={menuRef}>
		<MenuItem label={process.platform === 'darwin' ? appName : t('menus.fileMenu')}>
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
						role={'hide'}
					/>
					<MenuItem
						label={t('menus.hideOthers')}
						role={'hideothers'}
					/>
					<MenuItem
						label={t('menus.unhide')}
						role={'unhide'}
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
					label={t('menus.quit', { appName })}
					accelerator={'CommandOrControl+Q'}
					onClick={() => dispatch({ type: MENU_BAR_QUIT_CLICKED })}
				/>
			</Menu>
		</MenuItem>
		<MenuItem label={t('menus.editMenu')}>
			<Menu>
				<MenuItem
					label={t('menus.undo')}
					accelerator='CommandOrControl+Z'
					role='undo'
				/>
				<MenuItem
					label={t('menus.redo')}
					accelerator={process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z'}
					role='redo'
				/>
				<MenuItem type='separator' />
				<MenuItem
					label={t('menus.cut')}
					accelerator='CommandOrControl+X'
					role='cut'
				/>
				<MenuItem
					label={t('menus.copy')}
					accelerator='CommandOrControl+C'
					role='copy'
				/>
				<MenuItem
					label={t('menus.paste')}
					accelerator='CommandOrControl+V'
					role='paste'
				/>
				<MenuItem
					label={t('menus.selectAll')}
					accelerator='CommandOrControl+A'
					role='selectAll'
				/>
			</Menu>
		</MenuItem>
		<MenuItem label={t('menus.viewMenu')}>
			<Menu>
				<MenuItem
					label={t('menus.reload')}
					accelerator='CommandOrControl+R+A'
					onClick={() => dispatch({ type: MENU_BAR_RELOAD_SERVER_CLICKED })}
				/>
				<MenuItem
					label={t('menus.reloadIgnoringCache')}
					onClick={() => dispatch({ type: MENU_BAR_RELOAD_SERVER_CLICKED, payload: { ignoringCache: true } })}
				/>
				<MenuItem
					label={t('menus.openDevTools')}
					accelerator={process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I'}
					onClick={() => dispatch({ type: MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED })}
				/>
				<MenuItem type='separator' />
				<MenuItem
					label={t('menus.back')}
					accelerator={process.platform === 'darwin' ? 'Command+[' : 'Alt+Left'}
					onClick={() => dispatch({ type: MENU_BAR_GO_BACK_CLICKED })}
				/>
				<MenuItem
					label={t('menus.forward')}
					accelerator={process.platform === 'darwin' ? 'Command+]' : 'Alt+Right'}
					onClick={() => dispatch({ type: MENU_BAR_GO_FORWARD_CLICKED })}
				/>
				<MenuItem type='separator' />
				<MenuItem
					label={t('menus.showTrayIcon')}
					type='checkbox'
					checked={showTrayIcon}
					onClick={() => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showTrayIcon' })}
				/>
				{process.platform === 'darwin' && <>
					<MenuItem
						label={t('menus.showFullScreen')}
						type='checkbox'
						checked={showFullScreen}
						accelerator='Control+Command+F'
						onClick={() => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showFullScreen' })}
					/>
				</>}
				{process.platform !== 'darwin' && <>
					<MenuItem
						label={t('menus.showMenuBar')}
						type='checkbox'
						checked={showMenuBar}
						onClick={() => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showMenuBar' })}
					/>
				</>}
				<MenuItem
					label={t('menus.showServerList')}
					type='checkbox'
					checked={showServerList}
					onClick={() => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showServerList' })}
				/>
				<MenuItem type='separator' />
				<MenuItem
					label={t('menus.resetZoom')}
					accelerator='CommandOrControl+0'
					onClick={() => dispatch({ type: MENU_BAR_RESET_ZOOM_CLICKED })}
				/>
				<MenuItem
					label={t('menus.zoomIn')}
					accelerator='CommandOrControl+Plus'
					onClick={() => dispatch({ type: MENU_BAR_ZOOM_IN_CLICKED })}
				/>
				<MenuItem
					label={t('menus.zoomOut')}
					accelerator='CommandOrControl+-'
					onClick={() => dispatch({ type: MENU_BAR_ZOOM_OUT_CLICKED })}
				/>
			</Menu>
		</MenuItem>
		<MenuItem label={t('menus.windowMenu')} role='window'>
			<Menu>
				{process.platform === 'darwin' && <>
					<MenuItem
						label={t('menus.addNewServer')}
						accelerator='CommandOrControl+N'
						onClick={() => dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED })}
					/>
					<MenuItem type='separator' />
				</>}
				{servers.map((server, i) => <MenuItem
					key={i}
					type={currentServerUrl ? 'radio' : 'normal'}
					label={server.title.replace(/&/g, '&&')}
					checked={currentServerUrl === server.url}
					accelerator={`CommandOrControl+${ i + 1 }`}
					onClick={() => dispatch({ type: MENU_BAR_SELECT_SERVER_CLICKED, payload: server })}
				/>)}
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
					type='checkbox'
					label={t('menus.showOnUnreadMessage')}
					checked={showWindowOnUnreadChanged}
					onClick={() => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showWindowOnUnreadChanged' })}
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
		</MenuItem>
		<MenuItem label={t('menus.helpMenu')} role='help'>
			<Menu>
				<MenuItem
					label={t('menus.documentation')}
					onClick={() => dispatch({ type: MENU_BAR_OPEN_URL_CLICKED, payload: 'https://rocket.chat/docs' })}
				/>
				<MenuItem type='separator' />
				<MenuItem
					label={t('menus.reportIssue')}
					onClick={() => dispatch({ type: MENU_BAR_OPEN_URL_CLICKED, payload: 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new' })}
				/>
				<MenuItem
					label={t('menus.resetAppData')}
					onClick={() => dispatch({ type: MENU_BAR_RESET_APP_DATA_CLICKED })}
				/>
				<MenuItem
					label={t('menus.clearTrustedCertificates')}
					onClick={() => dispatch({ type: MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED })}
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
		</MenuItem>
	</Menu>;
}
