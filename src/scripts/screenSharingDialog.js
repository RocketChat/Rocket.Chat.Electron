import { desktopCapturer, ipcRenderer } from 'electron';

import i18n from '../i18n';

const setupScreenSharingDialog = () => {
	document.title = i18n.__('dialog.screenshare.title');
	document.querySelector('.screenshare-title').innerHTML = i18n.__('dialog.screenshare.announcement');

	const template = document.querySelector('.screenshare-source-template');

	desktopCapturer.getSources({ types: ['window', 'screen'] }).then((sources) => {
		document.querySelector('.screenshare-sources').innerHTML = '';

		sources.forEach(({ id, name, thumbnail }) => {
			const sourceView = document.importNode(template.content, true);

			sourceView.querySelector('.screenshare-source-thumbnail img').setAttribute('alt', name);
			sourceView.querySelector('.screenshare-source-thumbnail img').setAttribute('src', thumbnail.toDataURL());
			sourceView.querySelector('.screenshare-source-name').textContent = name;

			sourceView.querySelector('.screenshare-source').addEventListener('click', () => {
				ipcRenderer.send('select-screenshare-source', id);
				window.close();
			}, false);

			document.querySelector('.screenshare-sources').appendChild(sourceView);
		});
	});
};

export default setupScreenSharingDialog;
