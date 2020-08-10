import { ipcRenderer, WebviewTag } from 'electron';
import React, { useRef, useEffect, FC } from 'react';
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

type ServerPaneProps = {
	lastPath: string;
	serverUrl: string;
	isSelected: boolean;
	isFailed: boolean;
};

export const ServerPane: FC<ServerPaneProps> = ({
	lastPath,
	serverUrl,
	isSelected,
	isFailed,
}) => {
	const dispatch = useDispatch();

	const webviewRef = useRef<WebviewTag>();

	useEffect(() => {
		const handleWindowFocus = (): void => {
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
		const webview = webviewRef.current;

		const handleDidAttach = (): void => {
			ipcRenderer.send(EVENT_BROWSER_VIEW_ATTACHED, serverUrl, webview.getWebContents().id);
		};

		const handleFocus = (): void => {
			ipcRenderer.send(EVENT_WEB_CONTENTS_FOCUS_CHANGED, webview.getWebContents().id);
		};

		const handleBlur = (): void => {
			ipcRenderer.send(EVENT_WEB_CONTENTS_FOCUS_CHANGED);
		};

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

	const handleReload = (): void => {
		dispatch({
			type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
			payload: { url: serverUrl },
		});
	};

	return <Wrapper isVisible={isSelected}>
		<StyledWebView ref={webviewRef} isFailed={isFailed} />
		<ErrorView isFailed={isFailed} onReload={handleReload} />
	</Wrapper>;
};
