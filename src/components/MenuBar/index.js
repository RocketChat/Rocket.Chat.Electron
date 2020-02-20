import { remote } from 'electron';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { Menu } from '../electron/Menu';
import { AppMenu } from './AppMenu';
import { EditMenu } from './EditMenu';
import { ViewMenu } from './ViewMenu';
import { WindowMenu } from './WindowMenu';
import { HelpMenu } from './HelpMenu';

export function MenuBar() {
	const isMenuBarEnabled = useSelector(({ isMenuBarEnabled }) => isMenuBarEnabled);

	useEffect(() => {
		if (process.platform === 'darwin') {
			return;
		}

		remote.getCurrentWindow().autoHideMenuBar = !isMenuBarEnabled;
		remote.getCurrentWindow().setMenuBarVisibility(!!isMenuBarEnabled);
	}, [isMenuBarEnabled]);

	const [menu, setMenu] = useState(null);

	useEffect(() => {
		remote.Menu.setApplicationMenu(menu);
	}, [menu]);

	return <Menu ref={setMenu}>
		<AppMenu />
		<EditMenu />
		<ViewMenu />
		<WindowMenu />
		<HelpMenu />
	</Menu>;
}
