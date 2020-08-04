import { ipcRenderer } from 'electron';

import { SEND_EDIT_FLAGS_CHANGED } from '../ipc';

const getEditFlags = () => ({
	canUndo: document.queryCommandEnabled('undo'),
	canRedo: document.queryCommandEnabled('redo'),
	canCut: document.queryCommandEnabled('cut'),
	canCopy: document.queryCommandEnabled('copy'),
	canPaste: document.queryCommandEnabled('paste'),
	canSelectAll: document.queryCommandEnabled('selectAll'),
});

export const setupEditFlagsChanges = () => {
	document.addEventListener('focus', () => {
		ipcRenderer.send(SEND_EDIT_FLAGS_CHANGED, getEditFlags());
	}, true);

	document.addEventListener('selectionchange', () => {
		ipcRenderer.send(SEND_EDIT_FLAGS_CHANGED, getEditFlags());
	}, true);
};
