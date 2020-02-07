import React, { useEffect, useState, useRef } from 'react';

import { useWebviewFocus } from './useWebviewFocus';
import { useWebviewContextMenu } from './useWebviewContextMenu';
import { useWebviewPreload } from './useWebviewPreload';
import { useWebviewNavigation } from './useWebviewNavigation';

export function WebViewPane({
	active = false,
	failed = false,
	hasSidebar = false,
	lastPath,
	url,
}) {
	const webviewRef = useRef();
	const [webContents, setWebContents] = useState(null);

	useEffect(() => {
		const webview = webviewRef.current;

		const handleDidAttach = () => {
			setWebContents(webview.getWebContents());
		};

		const handleDestroyed = () => {
			setWebContents(null);
		};

		webview.addEventListener('did-attach', handleDidAttach);
		webview.addEventListener('destroyed', handleDestroyed);

		return () => {
			webview.removeEventListener('did-attach', handleDidAttach);
			webview.removeEventListener('destroyed', handleDestroyed);
		};
	}, [webviewRef]);

	useWebviewFocus(webviewRef, webContents, { url, active, failed, hasSidebar });
	useWebviewContextMenu(webviewRef, webContents, { url, active, failed, hasSidebar });
	useWebviewPreload(webviewRef, webContents, { url, active, failed, hasSidebar });
	useWebviewNavigation(webviewRef, webContents, { url, active, failed, hasSidebar });

	useEffect(() => {
		const webview = webviewRef.current;
		webview.src = lastPath || url;
	}, [webviewRef, lastPath, url]);

	return <webview
		allowpopups='allowpopups'
		className={[
			'webview',
			active && 'active',
			failed && 'hidden',
			failed && 'failed',
			!!webContents && 'ready',
			!hasSidebar && 'webview--without-side-bar',
		].filter(Boolean).join(' ')}
		disablewebsecurity='disablewebsecurity'
		enableremotemodule='true'
		preload='../preload.js'
		ref={webviewRef}
	/>;
}
