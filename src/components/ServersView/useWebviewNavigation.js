import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import {
	LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	SIDE_BAR_RELOAD_SERVER_CLICKED,
	WEBVIEW_DID_NAVIGATE,
	WEBVIEW_LOADING_DONE,
	WEBVIEW_LOADING_FAILED,
	WEBVIEW_LOADING_STARTED,
	CERTIFICATES_CLEARED,
	WEBVIEW_MESSAGE_BOX_BLURRED,
} from '../../actions';
import { useSaga } from '../SagaMiddlewareProvider';

export const useWebviewNavigation = (webviewRef, webContents, { url, active }) => {
	const dispatch = useDispatch();

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleDidNavigateInPage = (_, pageUrl) => {
			dispatch({ type: WEBVIEW_DID_NAVIGATE, payload: { webContentsId: webContents.id, url, pageUrl } });
		};

		webContents.addListener('did-navigate-in-page', handleDidNavigateInPage);

		return () => {
			webContents.removeListener('did-navigate-in-page', handleDidNavigateInPage);
		};
	}, [webContents, url, dispatch]);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleDidFinishLoad = () => {
			dispatch({ type: WEBVIEW_LOADING_DONE, payload: { webContentsId: webContents.id, url } });
		};

		webContents.addListener('did-finish-load', handleDidFinishLoad);

		return () => {
			webContents.removeListener('did-finish-load', handleDidFinishLoad);
		};
	}, [webContents, url, dispatch]);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleDidFailLoad = (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
			if (errorCode === -3) {
				console.warn('Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004');
				return;
			}
			if (isMainFrame) {
				dispatch({ type: WEBVIEW_LOADING_FAILED, payload: { webContentsId: webContents.id, url } });
			}
		};

		webContents.addListener('did-fail-load', handleDidFailLoad);

		return () => {
			webContents.removeListener('did-fail-load', handleDidFailLoad);
		};
	}, [webContents, url, dispatch]);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleDidStartLoading = () => {
			dispatch({ type: WEBVIEW_MESSAGE_BOX_BLURRED });
			dispatch({ type: WEBVIEW_LOADING_STARTED, payload: { webContentsId: webContents, url } });
		};

		webContents.addListener('did-start-loading', handleDidStartLoading);

		return () => {
			webContents.removeListener('did-start-loading', handleDidStartLoading);
		};
	}, [webContents, url, dispatch, webviewRef]);

	useSaga(function *() {
		if (!webContents) {
			return;
		}

		yield takeEvery([
			SIDE_BAR_RELOAD_SERVER_CLICKED,
			LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
		], function *({ payload: _url }) {
			if (url !== _url) {
				return;
			}

			webContents.loadURL(url);
		});

		yield takeEvery(SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, function *({ payload: _url }) {
			if (url !== _url) {
				return;
			}

			webContents.openDevTools();
		});

		yield takeEvery(MENU_BAR_RELOAD_SERVER_CLICKED, function *({ payload: { ignoringCache = false } = {} }) {
			if (!active) {
				return;
			}

			if (ignoringCache) {
				webContents.reloadIgnoringCache();
				return;
			}

			webContents.reload();
		});

		yield takeEvery(MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, function *() {
			if (!active) {
				return;
			}

			webContents.openDevTools();
		});

		yield takeEvery(MENU_BAR_GO_BACK_CLICKED, function *() {
			if (!active) {
				return;
			}

			webContents.goBack();
		});

		yield takeEvery(MENU_BAR_GO_FORWARD_CLICKED, function *() {
			if (!active) {
				return;
			}

			webContents.goForward();
		});

		yield takeEvery(CERTIFICATES_CLEARED, function *() {
			webContents.reloadIgnoringCache();
		});
	}, [webContents, url, active]);
};
