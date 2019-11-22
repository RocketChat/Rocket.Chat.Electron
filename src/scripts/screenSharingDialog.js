import { desktopCapturer, ipcRenderer, remote } from 'electron';
import { t } from 'i18next';

import { useRoot, useEffect, useRef } from './reactiveUi';
import { createDialog, destroyDialog } from './dialogs';

export function ScreenSharingDialog({ sources }) {
	const sourceSelectedRef = useRef(false);

	useEffect(() => () => {
		const { current: sourceSelected } = sourceSelectedRef;

		if (sourceSelected) {
			return;
		}

		ipcRenderer.send('select-screen-sharing-source', null);
	}, []);

	const handleScreenSharingSourceClick = (id) => () => {
		sourceSelectedRef.current = true;
		ipcRenderer.send('select-screen-sharing-source', id);
		ipcRenderer.send('close-screen-sharing-dialog');
	};

	const root = useRoot();

	root.querySelector('.screenshare-title').innerText = t('dialog.screenshare.announcement');

	while (root.querySelector('.screen-sharing-sources').firstChild) {
		root.querySelector('.screen-sharing-sources').firstChild.remove();
	}

	root.querySelector('.screen-sharing-sources').append(...sources.map(({ id, name, thumbnail }) => {
		const sourceView = document.importNode(root.querySelector('.screen-sharing-source-template').content, true);

		sourceView.querySelector('.screen-sharing-source').onclick = handleScreenSharingSourceClick(id);

		sourceView.querySelector('.screen-sharing-source-thumbnail img').setAttribute('alt', name);
		sourceView.querySelector('.screen-sharing-source-thumbnail img').setAttribute('src', thumbnail.toDataURL());

		sourceView.querySelector('.screen-sharing-source-name').innerText = name;

		return sourceView;
	}));

	return null;
}

export const openScreenSharingDialog = () => {
	createDialog({
		name: 'screen-sharing-dialog',
		component: ScreenSharingDialog,
		createProps: async () => {
			const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });

			return { sources };
		},
	});
};

export const closeScreenSharingDialog = () => {
	destroyDialog('screen-sharing-dialog');
};

export const selectScreenSharingSource = (id) => {
	remote.getCurrentWebContents().send('screen-sharing-source-selected', id || 'PermissionDeniedError');
};
