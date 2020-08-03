import { getContext, call, takeEvery, put } from 'redux-saga/effects';
import { app, BrowserWindow, shell, ipcMain, webContents } from 'electron';
import { channel } from 'redux-saga';

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
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
} from '../../actions';
import { getPlatform } from '../app';
import { selectIsSideBarVisible } from '../selectors';
import { watchValue } from '../sagas/utils';

const handleWillAttachWebview = (event, webPreferences) => {
	delete webPreferences.enableBlinkFeatures;
	webPreferences.preload = `${ app.getAppPath() }/app/preload.js`;
	webPreferences.nodeIntegration = false;
	webPreferences.nodeIntegrationInWorker = true;
	webPreferences.nodeIntegrationInSubFrames = true;
	webPreferences.enableRemoteModule = false;
	webPreferences.webSecurity = true;
};

const handleDidAttachWebview = (event, webContents) => {
	// webContents.send('console-warn', '%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
	// webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.description'));
	// webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));

	webContents.addListener('new-window', (event, url, frameName, disposition, options) => {
		event.preventDefault();

		if (disposition === 'foreground-tab' || disposition === 'background-tab') {
			shell.openExternal(url);
			return;
		}

		const newWindow = new BrowserWindow({
			...options,
			show: false,
		});

		newWindow.once('ready-to-show', () => {
			newWindow.show();
		});

		if (!options.webContents) {
			newWindow.loadURL(url);
		}

		event.newGuest = newWindow;
	});
};

export function *setupBrowserViews() {
	const rootWindow = yield getContext('rootWindow');

	yield call(() => {
		rootWindow.webContents.addListener('will-attach-webview', handleWillAttachWebview);
		rootWindow.webContents.addListener('did-attach-webview', handleDidAttachWebview);
	});

	const events = channel();

	yield call(() => {
		ipcMain.handle('get-webcontents-id', (event) => event.sender.id);
		ipcMain.handle('app-version', () => app.getVersion());

		ipcMain.addListener('title-changed', (event, { url, title }) => {
			events.put({ type: WEBVIEW_TITLE_CHANGED, payload: { url, title } });
		});

		ipcMain.addListener('favicon-changed', (event, { url, favicon }) => {
			events.put({ type: WEBVIEW_FAVICON_CHANGED, payload: { url, favicon } });
		});

		ipcMain.addListener('sidebar-style', (event, { url, style }) => {
			events.put({ type: WEBVIEW_SIDEBAR_STYLE_CHANGED, payload: { url, style } });
		});

		ipcMain.addListener('unread-changed', (event, { url, badge }) => {
			events.put({ type: WEBVIEW_UNREAD_CHANGED, payload: { url, badge } });
		});

		ipcMain.addListener('message-box-focus-changed', (event, { focused }) => {
			if (focused) {
				events.put({ type: WEBVIEW_MESSAGE_BOX_FOCUSED });
			} else {
				events.put({ type: WEBVIEW_MESSAGE_BOX_BLURRED });
			}
		});

		ipcMain.addListener('screen-sharing-source-requested', () => {
			events.put({ type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED });
		});

		ipcMain.addListener('focus-requested', (event, { url }) => {
			events.put({ type: WEBVIEW_FOCUS_REQUESTED, payload: { url } });
		});

		ipcMain.addListener('edit-flags-changed', (event, editFlags) => {
			events.put({ type: WEBVIEW_EDIT_FLAGS_CHANGED, payload: { editFlags } });
		});

		ipcMain.addListener('log-error', (event, error) => {
			console.error(error);
		});
	});

	yield takeEvery(events, function *(action) {
		yield put(action);
	});

	const platform = yield call(getPlatform);

	yield watchValue(selectIsSideBarVisible, function *([isSideBarVisible]) {
		if (platform !== 'darwin') {
			return;
		}

		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send('sidebar-visibility-changed', isSideBarVisible);
		});
	});

	yield takeEvery(SCREEN_SHARING_DIALOG_SOURCE_SELECTED, function *({ payload: sourceId }) {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send('screen-sharing-source-selected', sourceId);
		});
	});

	yield takeEvery(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, function *({ payload: buttonId }) {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send('format-button-touched', buttonId);
		});
	});
}
