import { desktopCapturer, ipcRenderer } from 'electron';
import { t } from 'i18next';

const setupScreenSharingDialog = async () => {
	const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });

	let sourceSelected = false;

	const root = document.querySelector('.screenshare-page');

	const render = () => {
		// useEffect
		document.title = t('dialog.screenshare.title');

		// useEffect cleanUp deps=[]
		window.onunload = () => {
			if (sourceSelected) {
				return;
			}

			ipcRenderer.send('select-screenshare-source', null);
		};

		const handleScreenSharingSourceClick = (id) => () => {
			sourceSelected = true;
			ipcRenderer.send('select-screenshare-source', id);
			ipcRenderer.send('close-screenshare-dialog');
		};

		root.querySelector('.screenshare-title').innerText = t('dialog.screenshare.announcement');

		while (root.querySelector('.screenshare-sources').firstChild) {
			root.querySelector('.screenshare-sources').firstChild.remove();
		}

		root.querySelector('.screenshare-sources').append(...sources.map(({ id, name, thumbnail }) => {
			const sourceView = document.importNode(root.querySelector('.screenshare-source-template').content, true);

			sourceView.querySelector('.screenshare-source').onclick = handleScreenSharingSourceClick(id);

			sourceView.querySelector('.screenshare-source-thumbnail img').setAttribute('alt', name);
			sourceView.querySelector('.screenshare-source-thumbnail img').setAttribute('src', thumbnail.toDataURL());

			sourceView.querySelector('.screenshare-source-name').innerText = name;

			return sourceView;
		}));
	};

	render();
};

export default setupScreenSharingDialog;
