import { remote } from 'electron';
import React, { useEffect, useRef } from 'react';

import { Menu } from '../electron/Menu';
import { AppMenu } from './AppMenu';
import { EditMenu } from './EditMenu';
import { ViewMenu } from './ViewMenu';
import { WindowMenu } from './WindowMenu';
import { HelpMenu } from './HelpMenu';

export function MenuBar({
	showFullScreen,
	showServerList,
	showTrayIcon,
	showMenuBar,
	showWindowOnUnreadChanged,
}) {
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

	useEffect(() => () => {
		remote.Menu.setApplicationMenu(null);
	}, []);

	return <Menu ref={menuRef}>
		<AppMenu />
		<EditMenu />
		<ViewMenu
			showFullScreen={showFullScreen}
			showMenuBar={showMenuBar}
			showServerList={showServerList}
			showTrayIcon={showTrayIcon}
		/>
		<WindowMenu
			showWindowOnUnreadChanged={showWindowOnUnreadChanged}
		/>
		<HelpMenu />
	</Menu>;
}
