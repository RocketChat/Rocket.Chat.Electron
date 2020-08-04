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
import {
	INVOKE_APP_VERSION,
	INVOKE_WEBCONTENTS_ID,
	SEND_LOG_ERROR,
	SEND_SCREEN_SHARING_SOURCE_REQUESTED,
	SEND_SCREEN_SHARING_SOURCE_SELECTED,
	SEND_EDIT_FLAGS_CHANGED,
	SEND_FOCUS_REQUESTED,
	SEND_TITLE_CHANGED,
	SEND_FAVICON_CHANGED,
	SEND_SIDEBAR_VISIBILITY_CHANGED,
	SEND_BADGE_CHANGED,
	SEND_SIDEBAR_STYLE,
	SEND_MESSAGE_BOX_FOCUS_CHANGED,
	SEND_FORMAT_BUTTON_TOUCHED,
} from '../../ipc';

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
		ipcMain.handle(INVOKE_APP_VERSION, () => app.getVersion());
		ipcMain.handle(INVOKE_WEBCONTENTS_ID, (event) => event.sender.id);

		ipcMain.addListener(SEND_TITLE_CHANGED, (event, { url, title }) => {
			events.put({ type: WEBVIEW_TITLE_CHANGED, payload: { url, title } });
		});

		ipcMain.addListener(SEND_FAVICON_CHANGED, (event, { url, favicon }) => {
			events.put({ type: WEBVIEW_FAVICON_CHANGED, payload: { url, favicon } });
		});

		ipcMain.addListener(SEND_SIDEBAR_STYLE, (event, { url, style }) => {
			events.put({ type: WEBVIEW_SIDEBAR_STYLE_CHANGED, payload: { url, style } });
		});

		ipcMain.addListener(SEND_BADGE_CHANGED, (event, { url, badge }) => {
			events.put({ type: WEBVIEW_UNREAD_CHANGED, payload: { url, badge } });
		});

		ipcMain.addListener(SEND_MESSAGE_BOX_FOCUS_CHANGED, (event, { focused }) => {
			if (focused) {
				events.put({ type: WEBVIEW_MESSAGE_BOX_FOCUSED });
			} else {
				events.put({ type: WEBVIEW_MESSAGE_BOX_BLURRED });
			}
		});

		ipcMain.addListener(SEND_SCREEN_SHARING_SOURCE_REQUESTED, () => {
			events.put({ type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED });
		});

		ipcMain.addListener(SEND_FOCUS_REQUESTED, (event, { url }) => {
			events.put({ type: WEBVIEW_FOCUS_REQUESTED, payload: { url } });
		});

		ipcMain.addListener(SEND_EDIT_FLAGS_CHANGED, (event, editFlags) => {
			events.put({ type: WEBVIEW_EDIT_FLAGS_CHANGED, payload: { editFlags } });
		});

		ipcMain.addListener(SEND_LOG_ERROR, (event, error) => {
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
			webContents.send(SEND_SIDEBAR_VISIBILITY_CHANGED, isSideBarVisible);
		});
	});

	yield takeEvery(SCREEN_SHARING_DIALOG_SOURCE_SELECTED, function *({ payload: sourceId }) {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send(SEND_SCREEN_SHARING_SOURCE_SELECTED, sourceId);
		});
	});

	yield takeEvery(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, function *({ payload: buttonId }) {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send(SEND_FORMAT_BUTTON_TOUCHED, buttonId);
		});
	});
}
