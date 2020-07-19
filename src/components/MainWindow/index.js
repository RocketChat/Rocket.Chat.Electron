import { remote } from 'electron';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { useSaga } from '../SagaMiddlewareProvider';
import { mainWindowStateSaga } from './sagas';
import { ROOT_WINDOW_WEBCONTENTS_FOCUSED, ROOT_WINDOW_EDIT_FLAGS_CHANGED } from '../../actions';

export function MainWindow({
	browserWindow = remote.getCurrentWindow(),
	children,
}) {
	const dispatch = useDispatch();

	useEffect(() => {
		const fetchAndDispatchFocusedWebContentsId = () => {
			const webContents = document.activeElement.matches('webview')
				? document.activeElement.getWebContents()
				: browserWindow.webContents;

			if (webContents.isDevToolsFocused()) {
				dispatch({ type: ROOT_WINDOW_WEBCONTENTS_FOCUSED, payload: -1 });
				return;
			}

			dispatch({ type: ROOT_WINDOW_WEBCONTENTS_FOCUSED, payload: webContents.id });
		};

		document.addEventListener('focus', fetchAndDispatchFocusedWebContentsId, true);
		document.addEventListener('blur', fetchAndDispatchFocusedWebContentsId, true);

		fetchAndDispatchFocusedWebContentsId();

		return () => {
			document.removeEventListener('focus', fetchAndDispatchFocusedWebContentsId);
			document.removeEventListener('blur', fetchAndDispatchFocusedWebContentsId);
		};
	}, [browserWindow, dispatch]);

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
			document.removeEventListener('focus', fetchAndDispatchEditFlags);
			document.removeEventListener('selectionchange', fetchAndDispatchEditFlags);
		};
	}, [dispatch]);

	useSaga(mainWindowStateSaga, [browserWindow]);

	return children;
}
