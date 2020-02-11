import { remote } from 'electron';
import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { Menu } from '../electron/Menu';
import { AppMenu } from './AppMenu';
import { EditMenu } from './EditMenu';
import { ViewMenu } from './ViewMenu';
import { WindowMenu } from './WindowMenu';
import { HelpMenu } from './HelpMenu';

export function MenuBar({
	isFullScreenEnabled,
}) {
	const isSideBarEnabled = useSelector(({ isSideBarEnabled }) => isSideBarEnabled);
	const isTrayIconEnabled = useSelector(({ isTrayIconEnabled }) => isTrayIconEnabled);
	const isMenuBarEnabled = useSelector(({ isMenuBarEnabled }) => isMenuBarEnabled);
	const isShowWindowOnUnreadChangedEnabled =		useSelector(({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled);

	useEffect(() => {
		if (process.platform === 'darwin') {
			return;
		}

		remote.getCurrentWindow().autoHideMenuBar = !isMenuBarEnabled;
		remote.getCurrentWindow().setMenuBarVisibility(!!isMenuBarEnabled);
	}, [isMenuBarEnabled]);

	const menuRef = useRef();
	const prevMenuRef = useRef();
	useEffect(() => {
		if (prevMenuRef.current === menuRef.current) {
			return;
		}

		remote.Menu.setApplicationMenu(menuRef.current);
		prevMenuRef.current = menuRef.current;
	});

	useEffect(() => () => {
		remote.Menu.setApplicationMenu(null);
	}, []);

	return <Menu ref={menuRef}>
		<AppMenu />
		<EditMenu />
		<ViewMenu
			showFullScreen={isFullScreenEnabled}
			showMenuBar={isMenuBarEnabled}
			showServerList={isSideBarEnabled}
			showTrayIcon={isTrayIconEnabled}
		/>
		<WindowMenu
			showWindowOnUnreadChanged={isShowWindowOnUnreadChangedEnabled}
		/>
		<HelpMenu />
	</Menu>;
}
