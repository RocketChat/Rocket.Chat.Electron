import { ipcRenderer } from 'electron';
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import {
	LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
	WEBVIEW_DID_START_LOADING,
	WEBVIEW_DID_FAIL_LOAD,
	WEBVIEW_DOM_READY,
} from '../../actions';
import { EVENT_BROWSER_VIEW_ATTACHED } from '../../ipc';
import ErrorView from './ErrorView';
import { StyledWebView, Wrapper } from './styles';

export function ServerPane({
	lastPath,
	serverUrl,
	isSelected,
}) {
	const dispatch = useDispatch();
	const webviewRef = useRef();
	const [isFailed, setFailed] = useState(false);

	useEffect(() => {
		const handleDidStartLoading = (_event, _serverUrl) => {
			if (serverUrl !== _serverUrl) {
				return;
			}

			setFailed(false);
		};

		const handleDidFailLoad = (_event, _serverUrl, errorCode, errorDescription, validatedURL, isMainFrame) => {
			if (serverUrl !== _serverUrl) {
				return;
			}

			if (errorCode === -3) {
				console.warn('Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004');
				return;
			}

			if (isMainFrame) {
				setFailed(true);
			}
		};

		const handleDomReady = (_event, _serverUrl) => {
			if (serverUrl !== _serverUrl) {
				return;
			}

			webviewRef.current.focus();
		};

		const handleWindowFocus = () => {
			if (!isSelected || isFailed) {
				return;
			}

			webviewRef.current.focus();
		};

		ipcRenderer.addListener(WEBVIEW_DID_START_LOADING, handleDidStartLoading);
		ipcRenderer.addListener(WEBVIEW_DID_FAIL_LOAD, handleDidFailLoad);
		ipcRenderer.addListener(WEBVIEW_DOM_READY, handleDomReady);
		window.addEventListener('focus', handleWindowFocus);

		return () => {
			ipcRenderer.removeListener(WEBVIEW_DID_START_LOADING, handleDidStartLoading);
			ipcRenderer.removeListener(WEBVIEW_DID_FAIL_LOAD, handleDidFailLoad);
			ipcRenderer.removeListener(WEBVIEW_DOM_READY, handleDomReady);
			window.removeEventListener('focus', handleWindowFocus);
		};
	}, [dispatch, isFailed, isSelected, serverUrl]);

	useEffect(() => {
		webviewRef.current.addEventListener('did-attach', () => {
			ipcRenderer.send(EVENT_BROWSER_VIEW_ATTACHED, serverUrl, webviewRef.current.getWebContents().id);
		});
	}, [serverUrl]);

	useEffect(() => {
		if (!webviewRef.current.src) {
			webviewRef.current.src = lastPath || serverUrl;
		}
	}, [lastPath, serverUrl]);

	const handleReload = () => {
		ipcRenderer.send(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, serverUrl);
	};

	return <Wrapper isVisible={isSelected}>
		<StyledWebView ref={webviewRef} isFailed={isFailed} />
		<ErrorView isFailed={isFailed} onReload={handleReload} />
	</Wrapper>;
}
