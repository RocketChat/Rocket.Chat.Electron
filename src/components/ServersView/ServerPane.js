import { ipcRenderer } from 'electron';
import React, { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import {
	LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
} from '../../actions';
import {
	EVENT_BROWSER_VIEW_ATTACHED,
	EVENT_WEB_CONTENTS_FOCUS_CHANGED,
} from '../../ipc';
import ErrorView from './ErrorView';
import { StyledWebView, Wrapper } from './styles';

export function ServerPane({
	lastPath,
	serverUrl,
	isSelected,
	isFailed,
}) {
	const dispatch = useDispatch();

	const webviewRef = useRef();

	useEffect(() => {
		const handleWindowFocus = () => {
			if (!isSelected || isFailed) {
				return;
			}

			webviewRef.current.focus();
		};

		window.addEventListener('focus', handleWindowFocus);

		return () => {
			window.removeEventListener('focus', handleWindowFocus);
		};
	}, [isFailed, isSelected, serverUrl]);

	useEffect(() => {
		const handleDidAttach = () => {
			ipcRenderer.send(EVENT_BROWSER_VIEW_ATTACHED, serverUrl, webviewRef.current.getWebContents().id);
		};

		const handleFocus = () => {
			ipcRenderer.send(EVENT_WEB_CONTENTS_FOCUS_CHANGED, document.activeElement.getWebContents().id);
		};

		const handleBlur = () => {
			ipcRenderer.send(EVENT_WEB_CONTENTS_FOCUS_CHANGED);
		};

		const webview = webviewRef.current;

		webview.addEventListener('did-attach', handleDidAttach);
		webview.addEventListener('focus', handleFocus);
		webview.addEventListener('blur', handleBlur);

		return () => {
			webview.removeEventListener('did-attach', handleDidAttach);
			webview.removeEventListener('focus', handleFocus);
			webview.removeEventListener('blur', handleBlur);
		};
	}, [serverUrl]);

	useEffect(() => {
		if (!webviewRef.current.src) {
			webviewRef.current.src = lastPath || serverUrl;
		}
	}, [lastPath, serverUrl]);

	const handleReload = () => {
		dispatch({
			type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
			payload: { url: serverUrl },
		});
	};

	return <Wrapper isVisible={isSelected}>
		<StyledWebView ref={webviewRef} isFailed={isFailed} />
		<ErrorView isFailed={isFailed} onReload={handleReload} />
	</Wrapper>;
}
