import { remote, ipcRenderer } from 'electron';

import i18n from '../i18n';

const { app, dialog, getCurrentWindow } = remote;

const setupUpdateDialog = () => {
	const { params: { newVersion } } = getCurrentWindow();

	const currentVersion = app.getVersion();

	document.title = i18n.__('dialog.update.title');
	document.querySelector('.update-title').innerHTML = i18n.__('dialog.update.announcement');
	document.querySelector('.update-message').innerHTML = i18n.__('dialog.update.message');
	document.querySelector('.current-version .app-version-label').innerHTML = i18n.__('dialog.update.currentVersion');
	document.querySelector('.new-version .app-version-label').innerHTML = i18n.__('dialog.update.newVersion');
	document.querySelector('.update-skip-action').innerHTML = i18n.__('dialog.update.skip');
	document.querySelector('.update-remind-action').innerHTML = i18n.__('dialog.update.remindLater');
	document.querySelector('.update-install-action').innerHTML = i18n.__('dialog.update.install');

	document.querySelector('.current-version .app-version-value').innerHTML = currentVersion;
	document.querySelector('.new-version .app-version-value').innerHTML = newVersion;

	document.querySelector('.update-skip-action').addEventListener('click', async (event) => {
		event.preventDefault();
		await dialog.showMessageBox(getCurrentWindow(), {
			type: 'warning',
			title: i18n.__('dialog.updateSkip.title'),
			message: i18n.__('dialog.updateSkip.message'),
			buttons: [i18n.__('dialog.updateSkip.ok')],
			defaultId: 0,
		});
		ipcRenderer.send('skip-update-version', newVersion);
		ipcRenderer.send('close-update-dialog');
	}, false);

	document.querySelector('.update-remind-action').addEventListener('click', (event) => {
		event.preventDefault();
		ipcRenderer.send('remind-update-later');
		ipcRenderer.send('close-update-dialog');
	}, false);

	document.querySelector('.update-install-action').addEventListener('click', async (event) => {
		event.preventDefault();
		await dialog.showMessageBox(getCurrentWindow(), {
			type: 'info',
			title: i18n.__('dialog.updateDownloading.title'),
			message: i18n.__('dialog.updateDownloading.message'),
			buttons: [i18n.__('dialog.updateDownloading.ok')],
			defaultId: 0,
		});
		ipcRenderer.send('download-update');
		ipcRenderer.send('close-update-dialog');
	}, false);

	document.querySelector('.update-install-action').focus();
};

export default setupUpdateDialog;
