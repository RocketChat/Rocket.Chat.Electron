import { ipcRenderer } from 'electron';

import { EVENT_EDIT_FLAGS_CHANGED } from '../ipc';

const getEditFlags = () => ({
	canUndo: document.queryCommandEnabled('undo'),
	canRedo: document.queryCommandEnabled('redo'),
	canCut: document.queryCommandEnabled('cut'),
	canCopy: document.queryCommandEnabled('copy'),
	canPaste: document.queryCommandEnabled('paste'),
	canSelectAll: document.queryCommandEnabled('selectAll'),
});

const handleFocusEvent = () => {
	ipcRenderer.send(EVENT_EDIT_FLAGS_CHANGED, getEditFlags());
};

const handleSelectionChangeEvent = () => {
	ipcRenderer.send(EVENT_EDIT_FLAGS_CHANGED, getEditFlags());
};

export const setupEditFlagsChanges = async () => {
	document.addEventListener('focus', handleFocusEvent, true);
	document.addEventListener('selectionchange', handleSelectionChangeEvent, true);
};
