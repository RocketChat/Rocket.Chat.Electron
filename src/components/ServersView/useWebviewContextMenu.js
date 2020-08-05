import { ipcRenderer } from 'electron';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { EVENT_BROWSER_VIEW_CONTEXT_MENU_TRIGGERED } from '../../ipc';

export const useWebviewContextMenu = (webviewRef, webContents) => {
	const dispatch = useDispatch();

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleContextMenu = async (event) => {
			event.preventDefault();
			ipcRenderer.send(EVENT_BROWSER_VIEW_CONTEXT_MENU_TRIGGERED, event.params);
		};

		const root = webviewRef.current;

		root.addEventListener('context-menu', handleContextMenu);

		return () => {
			root.removeEventListener('context-menu', handleContextMenu);
		};
	}, [dispatch, webContents, webviewRef]);
};
