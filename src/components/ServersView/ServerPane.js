import { ipcRenderer } from 'electron';
import React, { useRef, useEffect } from 'react';

import {
	LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
} from '../../actions';
import { EVENT_BROWSER_VIEW_ATTACHED } from '../../ipc';
import ErrorView from './ErrorView';
import { StyledWebView, Wrapper } from './styles';

export function ServerPane({
	lastPath,
	serverUrl,
	isSelected,
	isFailed,
}) {
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
