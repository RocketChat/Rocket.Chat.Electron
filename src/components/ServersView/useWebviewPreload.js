import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import {
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	WEBVIEW_FAVICON_CHANGED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_UNREAD_CHANGED,
	WEBVIEW_MESSAGE_BOX_FOCUSED,
	WEBVIEW_MESSAGE_BOX_BLURRED,
	WEBVIEW_EDIT_FLAGS_CHANGED,
} from '../../actions';
import { useSaga } from '../SagaMiddlewareProvider';
import { useMisspellingDetection } from '../../hooks/useMisspellingDetection';

export const useWebviewPreload = (webviewRef, webContents, { url, hasSidebar, active, failed }) => {
	const dispatch = useDispatch();
	const getMisspelledWords = useMisspellingDetection();

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleIpcMessage = async (event) => {
			const { channel, args } = event;

			switch (channel) {
				case 'get-sourceId':
					dispatch({ type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED, payload: { webContentsId: webContents.id, url } });
					break;

				case 'unread-changed':
					dispatch({ type: WEBVIEW_UNREAD_CHANGED, payload: { webContentsId: webContents.id, url, badge: args[0] } });
					break;

				case 'title-changed':
					dispatch({ type: WEBVIEW_TITLE_CHANGED, payload: { webContentsId: webContents.id, url, title: args[0] } });
					break;

				case 'focus':
					dispatch({ type: WEBVIEW_FOCUS_REQUESTED, payload: { webContentsId: webContents.id, url } });
					break;

				case 'sidebar-style':
					dispatch({ type: WEBVIEW_SIDEBAR_STYLE_CHANGED, payload: { webContentsId: webContents.id, url, style: args[0] } });
					break;

				case 'get-misspelled-words':
					webContents.send('misspelled-words', JSON.stringify(args[0]), await getMisspelledWords(args[0]));
					break;

				case 'favicon-changed':
					dispatch({ type: WEBVIEW_FAVICON_CHANGED, payload: { webContentsId: webContents.id, url, favicon: args[0] } });
					break;

				case 'message-box-focused':
					dispatch({ type: WEBVIEW_MESSAGE_BOX_FOCUSED, payload: { webContentsId: webContents.id, url } });
					break;

				case 'message-box-blurred':
					dispatch({ type: WEBVIEW_MESSAGE_BOX_BLURRED, payload: { webContentsId: webContents.id, url } });
					break;

				case 'edit-flags-changed':
					dispatch({ type: WEBVIEW_EDIT_FLAGS_CHANGED, payload: { webContentsId: webContents.id, url, editFlags: args[0] } });
			}
		};

		const webview = webviewRef.current;

		webview.addEventListener('ipc-message', handleIpcMessage);

		return () => {
			webview.removeEventListener('ipc-message', handleIpcMessage);
		};
	}, [webviewRef, webContents, url, dispatch, getMisspelledWords]);

	useEffect(() => {
		if (!webContents || process.platform !== 'darwin') {
			return;
		}

		webContents.send('sidebar-visibility-changed', hasSidebar);
	}, [webContents, hasSidebar]);

	const visible = active && !failed;

	useSaga(function *() {
		if (!webContents || !visible) {
			return;
		}

		yield takeEvery(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, function *({ payload: buttonId }) {
			webContents.send('format-button-touched', buttonId);
		});

		yield takeEvery(SCREEN_SHARING_DIALOG_SOURCE_SELECTED, function *({ payload: sourceId }) {
			webContents.send('screen-sharing-source-selected', sourceId);
		});
	}, [webContents, visible]);

	const dictionaryName = useSelector(({ spellCheckingDictionaries }) =>
		spellCheckingDictionaries.filter(({ enabled }) => enabled).map(({ name }) => name)[0]);

	useEffect(() => {
		if (!webContents || !visible) {
			return;
		}

		const language = dictionaryName ? dictionaryName.split(/[-_]/g)[0] : null;
		webContents.send('set-spell-checking-language', language);
	}, [webContents, visible, dictionaryName]);
};
