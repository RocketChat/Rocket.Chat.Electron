import { ipcMain, webContents } from 'electron';

import {
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_FAVICON_CHANGED,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	WEBVIEW_UNREAD_CHANGED,
	WEBVIEW_MESSAGE_BOX_FOCUSED,
	WEBVIEW_MESSAGE_BOX_BLURRED,
	WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
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
	QUERY_SCREEN_SHARING_SOURCE,
	EVENT_SIDEBAR_VISIBLE,
	EVENT_SIDEBAR_HIDDEN,
	EVENT_MESSAGE_BOX_BLURRED,
	EVENT_MESSAGE_BOX_FOCUSED,
	EVENT_SCREEN_SHARING_SOURCE_SELECTED,
} from '../../ipc';
import { selectIsSideBarVisible } from '../selectors';

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

	ipcMain.addListener(EVENT_MESSAGE_BOX_FOCUSED, () => {
		reduxStore.dispatch({ type: WEBVIEW_MESSAGE_BOX_FOCUSED });
	});

	ipcMain.addListener(EVENT_MESSAGE_BOX_BLURRED, () => {
		reduxStore.dispatch({ type: WEBVIEW_MESSAGE_BOX_BLURRED });
	});

	ipcMain.addListener(EVENT_SERVER_FOCUSED, (event, { url }) => {
		rootWindow.show();
		reduxStore.dispatch({ type: WEBVIEW_FOCUS_REQUESTED, payload: { url } });
	});

	ipcMain.addListener(EVENT_EDIT_FLAGS_CHANGED, (event, editFlags) => {
		reduxStore.dispatch({ type: WEBVIEW_EDIT_FLAGS_CHANGED, payload: { editFlags } });
	});

	ipcMain.handle(QUERY_SCREEN_SHARING_SOURCE, async () => {
		reduxStore.dispatch({ type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED });

		return new Promise((resolve) => {
			ipcMain.prependOnceListener(EVENT_SCREEN_SHARING_SOURCE_SELECTED, (event, sourceId) => {
				resolve(sourceId);
			});
		});
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
