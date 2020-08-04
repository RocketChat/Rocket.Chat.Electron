import { getContext, call, takeEvery, put, spawn, take } from 'redux-saga/effects';
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
	EVENT_EDIT_FLAGS_CHANGED,
	EVENT_SERVER_FOCUSED,
	EVENT_SERVER_TITLE_CHANGED,
	EVENT_SERVER_FAVICON_CHANGED,
	EVENT_SERVER_BADGE_CHANGED,
	EVENT_SERVER_SIDEBAR_STYLE_CHANGED,
	EVENT_FORMAT_BUTTON_TOUCHED,
	QUERY_SCREEN_SHARING_SOURCE,
	EVENT_SIDEBAR_VISIBLE,
	EVENT_SIDEBAR_HIDDEN,
	EVENT_MESSAGE_BOX_BLURRED,
	EVENT_MESSAGE_BOX_FOCUSED,
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
	const sagasChannel = channel();

	yield call(() => {
		ipcMain.addListener(EVENT_SERVER_TITLE_CHANGED, (event, { url, title }) => {
			events.put({ type: WEBVIEW_TITLE_CHANGED, payload: { url, title } });
		});

		ipcMain.addListener(EVENT_SERVER_FAVICON_CHANGED, (event, { url, favicon }) => {
			events.put({ type: WEBVIEW_FAVICON_CHANGED, payload: { url, favicon } });
		});

		ipcMain.addListener(EVENT_SERVER_SIDEBAR_STYLE_CHANGED, (event, { url, style }) => {
			events.put({ type: WEBVIEW_SIDEBAR_STYLE_CHANGED, payload: { url, style } });
		});

		ipcMain.addListener(EVENT_SERVER_BADGE_CHANGED, (event, { url, badge }) => {
			events.put({ type: WEBVIEW_UNREAD_CHANGED, payload: { url, badge } });
		});

		ipcMain.addListener(EVENT_MESSAGE_BOX_FOCUSED, () => {
			events.put({ type: WEBVIEW_MESSAGE_BOX_FOCUSED });
		});

		ipcMain.addListener(EVENT_MESSAGE_BOX_BLURRED, () => {
			events.put({ type: WEBVIEW_MESSAGE_BOX_BLURRED });
		});

		ipcMain.addListener(EVENT_SERVER_FOCUSED, (event, { url }) => {
			events.put({ type: WEBVIEW_FOCUS_REQUESTED, payload: { url } });
		});

		ipcMain.addListener(EVENT_EDIT_FLAGS_CHANGED, (event, editFlags) => {
			events.put({ type: WEBVIEW_EDIT_FLAGS_CHANGED, payload: { editFlags } });
		});

		ipcMain.handle(QUERY_SCREEN_SHARING_SOURCE, () => new Promise((resolve, reject) => {
			sagasChannel.put(function *() {
				yield put({ type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED });
				const { payload: sourceId } = yield take(SCREEN_SHARING_DIALOG_SOURCE_SELECTED);

				if (sourceId) {
					resolve(sourceId);
					return;
				}

				reject();
			});
		}));
	});

	yield takeEvery(sagasChannel, function *(saga) {
		yield spawn(saga);
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
			if (isSideBarVisible) {
				webContents.send(EVENT_SIDEBAR_VISIBLE);
			} else {
				webContents.send(EVENT_SIDEBAR_HIDDEN);
			}
		});
	});

	yield takeEvery(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, function *({ payload: buttonId }) {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send(EVENT_FORMAT_BUTTON_TOUCHED, buttonId);
		});
	});
}
