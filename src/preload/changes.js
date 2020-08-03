import { ipcRenderer } from 'electron';
import { t } from 'i18next';

export default () => {
	window.addEventListener('get-sourceId', (event) => {
		ipcRenderer.sendToHost('get-sourceId', event.detail);
	});

	document.addEventListener('focus', () => {
		ipcRenderer.sendToHost('edit-flags-changed', {
			canUndo: document.queryCommandEnabled('undo'),
			canRedo: document.queryCommandEnabled('redo'),
			canCut: document.queryCommandEnabled('cut'),
			canCopy: document.queryCommandEnabled('copy'),
			canPaste: document.queryCommandEnabled('paste'),
			canSelectAll: document.queryCommandEnabled('selectAll'),
		});
	}, true);

	document.addEventListener('selectionchange', () => {
		ipcRenderer.sendToHost('edit-flags-changed', {
			canUndo: document.queryCommandEnabled('undo'),
			canRedo: document.queryCommandEnabled('redo'),
			canCut: document.queryCommandEnabled('cut'),
			canCopy: document.queryCommandEnabled('copy'),
			canPaste: document.queryCommandEnabled('paste'),
			canSelectAll: document.queryCommandEnabled('selectAll'),
		});
	}, true);

	ipcRenderer.addListener('screen-sharing-source-selected', (_, source) => {
		window.parent.postMessage({ sourceId: source || 'PermissionDeniedError' }, '*');
	});

	console.warn('%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
	console.warn('%c%s', 'font-size: 20px;', t('selfxss.description'));
	console.warn('%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));
};
