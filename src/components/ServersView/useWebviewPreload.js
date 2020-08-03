import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import {
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
	WEBVIEW_EDIT_FLAGS_CHANGED,
} from '../../actions';
import { useSaga } from '../SagaMiddlewareProvider';

export const useWebviewPreload = (webviewRef, webContents, { url, active, failed }) => {
	const dispatch = useDispatch();

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

				case 'focus':
					dispatch({ type: WEBVIEW_FOCUS_REQUESTED, payload: { webContentsId: webContents.id, url } });
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
	}, [webviewRef, webContents, url, dispatch]);

	const visible = active && !failed;

	useSaga(function *() {
		if (!webContents || !visible) {
			return;
		}

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
