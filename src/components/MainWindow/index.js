import { ipcRenderer } from 'electron';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import {
	ROOT_WINDOW_EDIT_FLAGS_CHANGED,
} from '../../actions';
import {
	EVENT_WEB_CONTENTS_FOCUS_CHANGED,
} from '../../ipc';

export function MainWindow({ children }) {
	const dispatch = useDispatch();

	useEffect(() => {
		const fetchAndDispatchFocusedWebContentsId = () => {
			if (document.activeElement.matches('webview')) {
				ipcRenderer.send(EVENT_WEB_CONTENTS_FOCUS_CHANGED, document.activeElement.getWebContents().id);
				return;
			}

			ipcRenderer.send(EVENT_WEB_CONTENTS_FOCUS_CHANGED);
		};

		document.addEventListener('focus', fetchAndDispatchFocusedWebContentsId, true);
		document.addEventListener('blur', fetchAndDispatchFocusedWebContentsId, true);

		fetchAndDispatchFocusedWebContentsId();

		return () => {
			document.removeEventListener('focus', fetchAndDispatchFocusedWebContentsId);
			document.removeEventListener('blur', fetchAndDispatchFocusedWebContentsId);
		};
	}, [dispatch]);

	useEffect(() => {
		const fetchAndDispatchEditFlags = () => {
			dispatch({
				type: ROOT_WINDOW_EDIT_FLAGS_CHANGED,
				payload: {
					canUndo: document.queryCommandEnabled('undo'),
					canRedo: document.queryCommandEnabled('redo'),
					canCut: document.queryCommandEnabled('cut'),
					canCopy: document.queryCommandEnabled('copy'),
					canPaste: document.queryCommandEnabled('paste'),
					canSelectAll: document.queryCommandEnabled('selectAll'),
				},
			});
		};

		document.addEventListener('focus', fetchAndDispatchEditFlags, true);
		document.addEventListener('selectionchange', fetchAndDispatchEditFlags, true);

		return () => {
			document.removeEventListener('focus', fetchAndDispatchEditFlags, true);
			document.removeEventListener('selectionchange', fetchAndDispatchEditFlags, true);
		};
	}, [dispatch]);

	return children;
}
