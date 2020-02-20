import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { MenuItem } from '../electron/MenuItem';
import { Menu } from '../electron/Menu';
import {
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
} from '../../actions';

export const ViewMenu = forwardRef(function ViewMenu(_, ref) {
	const isSideBarEnabled = useSelector(({ isSideBarEnabled }) => isSideBarEnabled);
	const isTrayIconEnabled = useSelector(({ isTrayIconEnabled }) => isTrayIconEnabled);
	const isMenuBarEnabled = useSelector(({ isMenuBarEnabled }) => isMenuBarEnabled);
	const isFullScreenEnabled = useSelector(({ mainWindowState: { fullscreen } }) => fullscreen);
	const { t } = useTranslation();
	const dispatch = useDispatch();

	return <MenuItem ref={ref} label={t('menus.viewMenu')}>
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
				checked={isTrayIconEnabled}
				onClick={({ checked }) => dispatch({ type: MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED, payload: checked })}
			/>
			{process.platform === 'darwin' && <>
				<MenuItem
					label={t('menus.showFullScreen')}
					type='checkbox'
					checked={isFullScreenEnabled}
					accelerator='Control+Command+F'
					onClick={({ checked }) => dispatch({ type: MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED, payload: checked })}
				/>
			</>}
			{process.platform !== 'darwin' && <>
				<MenuItem
					label={t('menus.showMenuBar')}
					type='checkbox'
					checked={isMenuBarEnabled}
					onClick={({ checked }) => dispatch({ type: MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED, payload: checked })}
				/>
			</>}
			<MenuItem
				label={t('menus.showServerList')}
				type='checkbox'
				checked={isSideBarEnabled}
				onClick={({ checked }) => dispatch({ type: MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED, payload: checked })}
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
	</MenuItem>;
});
