import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { WEBVIEW_FOCUSED } from '../../actions';

export const useWebviewFocus = (webviewRef, webContents, { url, active, failed }) => {
	const dispatch = useDispatch();

	const visible = active && !failed;

	useEffect(() => {
		if (!webContents || !visible) {
			return;
		}

		const webview = webviewRef.current;

		const handle = () => {
			webview.focus();
		};

		handle();

		window.addEventListener('focus', handle);
		webContents.addListener('dom-ready', handle);

		return () => {
			window.removeEventListener('focus', handle);
			webContents.removeListener('dom-ready', handle);
		};
	}, [webviewRef, webContents, visible]);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const webview = webviewRef.current;

		const handleFocus = () => {
			dispatch({ type: WEBVIEW_FOCUSED, payload: { webContentsId: webContents.id, url } });
		};

		webview.addEventListener('focus', handleFocus);

		return () => {
			webview.removeEventListener('focus', handleFocus);
		};
	}, [webviewRef, webContents, dispatch, url]);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

		const handleBeforeInputEvent = (_, { type, key }) => {
			if (key !== shortcutKey) {
				return;
			}

			webContents.hostWebContents.sendInputEvent({ type, keyCode: key });
		};

		webContents.addListener('before-input-event', handleBeforeInputEvent);

		return () => {
			webContents.removeListener('before-input-event', handleBeforeInputEvent);
		};
	}, [webContents, dispatch]);
};
