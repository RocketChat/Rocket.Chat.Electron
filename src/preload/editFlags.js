import { ipcRenderer } from 'electron';

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
		ipcRenderer.send('edit-flags-changed', getEditFlags());
	}, true);

	document.addEventListener('selectionchange', () => {
		ipcRenderer.send('edit-flags-changed', getEditFlags());
	}, true);
};
