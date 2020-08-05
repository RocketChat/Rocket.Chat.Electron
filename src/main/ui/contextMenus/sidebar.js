import { Menu, ipcMain } from 'electron';
import { t } from 'i18next';

import {
	SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	SIDE_BAR_RELOAD_SERVER_CLICKED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
} from '../../../actions';
import { EVENT_SIDEBAR_CONTEXT_MENU_TRIGGERED } from '../../../ipc';

export const setupSideBarContextMenu = (reduxStore, rootWindow) => {
	ipcMain.addListener(EVENT_SIDEBAR_CONTEXT_MENU_TRIGGERED, (event, url) => {
		const menuTemplate = [
			{
				label: t('sidebar.item.reload'),
				click: () => {
					reduxStore.dispatch({ type: SIDE_BAR_RELOAD_SERVER_CLICKED, payload: url });
				},
			},
			{
				label: t('sidebar.item.remove'),
				click: () => {
					reduxStore.dispatch({ type: SIDE_BAR_REMOVE_SERVER_CLICKED, payload: url });
				},
			},
			{ type: 'separator' },
			{
				label: t('sidebar.item.openDevTools'),
				click: () => {
					reduxStore.dispatch({ type: SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, payload: url });
				},
			},
		];
		const menu = Menu.buildFromTemplate(menuTemplate);
		menu.popup(rootWindow);
	});
};
