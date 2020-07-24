import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { WEBVIEW_CONTEXT_MENU_POPPED_UP } from '../../actions';

export const useWebviewContextMenu = (webviewRef, webContents) => {
	const dispatch = useDispatch();

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleContextMenu = async (event) => {
			event.preventDefault();
			dispatch({ type: WEBVIEW_CONTEXT_MENU_POPPED_UP, payload: event.params });
		};

		const root = webviewRef.current;

		root.addEventListener('context-menu', handleContextMenu);

		return () => {
			root.removeEventListener('context-menu', handleContextMenu);
		};
	}, [dispatch, webContents, webviewRef]);
};
