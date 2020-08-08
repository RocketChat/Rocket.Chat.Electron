import { WEBVIEW_EDIT_FLAGS_CHANGED } from '../actions';
import { dispatch } from '../channels';

const getEditFlags = () => ({
	canUndo: document.queryCommandEnabled('undo'),
	canRedo: document.queryCommandEnabled('redo'),
	canCut: document.queryCommandEnabled('cut'),
	canCopy: document.queryCommandEnabled('copy'),
	canPaste: document.queryCommandEnabled('paste'),
	canSelectAll: document.queryCommandEnabled('selectAll'),
});

const handleFocusEvent = () => {
	dispatch({
		type: WEBVIEW_EDIT_FLAGS_CHANGED,
		payload: getEditFlags(),
	});
};

const handleSelectionChangeEvent = () => {
	dispatch({
		type: WEBVIEW_EDIT_FLAGS_CHANGED,
		payload: getEditFlags(),
	});
};

export const setupEditFlagsChanges = async () => {
	document.addEventListener('focus', handleFocusEvent, true);
	document.addEventListener('selectionchange', handleSelectionChangeEvent, true);
};
