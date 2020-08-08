import { ipcMain, webContents } from 'electron';

import {
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_FAVICON_CHANGED,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	WEBVIEW_UNREAD_CHANGED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_EDIT_FLAGS_CHANGED,
} from '../../actions';
import {
	EVENT_EDIT_FLAGS_CHANGED,
	EVENT_SERVER_FOCUSED,
	EVENT_SERVER_TITLE_CHANGED,
	EVENT_SERVER_FAVICON_CHANGED,
	EVENT_SERVER_BADGE_CHANGED,
	EVENT_SERVER_SIDEBAR_STYLE_CHANGED,
	EVENT_SIDEBAR_VISIBLE,
	EVENT_SIDEBAR_HIDDEN,
} from '../../ipc';
import { selectIsSideBarVisible } from '../../selectors';


export const setupBrowserViews = (reduxStore, rootWindow) => {
	ipcMain.addListener(EVENT_SERVER_TITLE_CHANGED, (event, { url, title }) => {
		reduxStore.dispatch({ type: WEBVIEW_TITLE_CHANGED, payload: { url, title } });
	});

	ipcMain.addListener(EVENT_SERVER_FAVICON_CHANGED, (event, { url, favicon }) => {
		reduxStore.dispatch({ type: WEBVIEW_FAVICON_CHANGED, payload: { url, favicon } });
	});

	ipcMain.addListener(EVENT_SERVER_SIDEBAR_STYLE_CHANGED, (event, { url, style }) => {
		reduxStore.dispatch({ type: WEBVIEW_SIDEBAR_STYLE_CHANGED, payload: { url, style } });
	});

	ipcMain.addListener(EVENT_SERVER_BADGE_CHANGED, (event, { url, badge }) => {
		reduxStore.dispatch({ type: WEBVIEW_UNREAD_CHANGED, payload: { url, badge } });
	});

	ipcMain.addListener(EVENT_SERVER_FOCUSED, (event, { url }) => {
		rootWindow.show();
		reduxStore.dispatch({ type: WEBVIEW_FOCUS_REQUESTED, payload: { url } });
	});

	ipcMain.addListener(EVENT_EDIT_FLAGS_CHANGED, (event, editFlags) => {
		reduxStore.dispatch({ type: WEBVIEW_EDIT_FLAGS_CHANGED, payload: { editFlags } });
	});

	let prevIsSideBarVisible;
	reduxStore.subscribe(() => {
		const isSideBarVisible = selectIsSideBarVisible(reduxStore.getState());
		if (prevIsSideBarVisible !== isSideBarVisible) {
			if (process.platform !== 'darwin') {
				return;
			}

			webContents.getAllWebContents().forEach((webContents) => {
				if (isSideBarVisible) {
					webContents.send(EVENT_SIDEBAR_VISIBLE);
				} else {
					webContents.send(EVENT_SIDEBAR_HIDDEN);
				}
			});

			prevIsSideBarVisible = isSideBarVisible;
		}
	});
};
