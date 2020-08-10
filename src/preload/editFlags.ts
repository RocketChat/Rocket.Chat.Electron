import { EditFlags } from 'electron';

import { WEBVIEW_EDIT_FLAGS_CHANGED } from '../actions';
import { dispatch } from '../channels';

const getEditFlags = (): EditFlags => ({
	canUndo: document.queryCommandEnabled('undo'),
	canRedo: document.queryCommandEnabled('redo'),
	canCut: document.queryCommandEnabled('cut'),
	canCopy: document.queryCommandEnabled('copy'),
	canPaste: document.queryCommandEnabled('paste'),
	canSelectAll: document.queryCommandEnabled('selectAll'),
	canDelete: document.queryCommandEnabled('delete'),
});

const handleFocusEvent = (): void => {
	dispatch({
		type: WEBVIEW_EDIT_FLAGS_CHANGED,
		payload: getEditFlags(),
	});
};

const handleSelectionChangeEvent = (): void => {
	dispatch({
		type: WEBVIEW_EDIT_FLAGS_CHANGED,
		payload: getEditFlags(),
	});
};

export const setupEditFlagsChanges = (): void => {
	document.addEventListener('focus', handleFocusEvent, true);
	document.addEventListener('selectionchange', handleSelectionChangeEvent, true);
};
