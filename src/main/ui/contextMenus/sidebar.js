import { Menu, ipcMain } from 'electron';
import { t } from 'i18next';

import { SIDE_BAR_REMOVE_SERVER_CLICKED } from '../../../actions';
import { EVENT_SIDEBAR_CONTEXT_MENU_TRIGGERED } from '../../../ipc';
import { getWebContentsByServerUrl } from '../rootWindow';

export const setupSideBarContextMenu = (reduxStore, rootWindow) => {
	ipcMain.addListener(EVENT_SIDEBAR_CONTEXT_MENU_TRIGGERED, (event, serverUrl) => {
		const menuTemplate = [
			{
				label: t('sidebar.item.reload'),
				click: () => {
					const guestWebContents = getWebContentsByServerUrl(serverUrl);
					guestWebContents.loadURL(serverUrl);
				},
			},
			{
				label: t('sidebar.item.remove'),
				click: () => {
					reduxStore.dispatch({ type: SIDE_BAR_REMOVE_SERVER_CLICKED, payload: serverUrl });
				},
			},
			{ type: 'separator' },
			{
				label: t('sidebar.item.openDevTools'),
				click: () => {
					const guestWebContents = getWebContentsByServerUrl(serverUrl);
					guestWebContents.openDevTools();
				},
			},
		];
		const menu = Menu.buildFromTemplate(menuTemplate);
		menu.popup(rootWindow);
	});
};
