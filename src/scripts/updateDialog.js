import { remote, ipcRenderer } from 'electron';
import { t } from 'i18next';

const { app, dialog, getCurrentWindow } = remote;

const setupUpdateDialog = () => {
	const { params: { newVersion } } = getCurrentWindow();

	const currentVersion = app.getVersion();

	document.title = t('dialog.update.title');
	document.querySelector('.update-title').innerHTML = t('dialog.update.announcement');
	document.querySelector('.update-message').innerHTML = t('dialog.update.message');
	document.querySelector('.current-version .app-version-label').innerHTML = t('dialog.update.currentVersion');
	document.querySelector('.new-version .app-version-label').innerHTML = t('dialog.update.newVersion');
	document.querySelector('.update-skip-action').innerHTML = t('dialog.update.skip');
	document.querySelector('.update-remind-action').innerHTML = t('dialog.update.remindLater');
	document.querySelector('.update-install-action').innerHTML = t('dialog.update.install');

	document.querySelector('.current-version .app-version-value').innerHTML = currentVersion;
	document.querySelector('.new-version .app-version-value').innerHTML = newVersion;

	document.querySelector('.update-skip-action').addEventListener('click', async (event) => {
		event.preventDefault();
		await dialog.showMessageBox(getCurrentWindow(), {
			type: 'warning',
			title: t('dialog.updateSkip.title'),
			message: t('dialog.updateSkip.message'),
			buttons: [t('dialog.updateSkip.ok')],
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
			title: t('dialog.updateDownloading.title'),
			message: t('dialog.updateDownloading.message'),
			buttons: [t('dialog.updateDownloading.ok')],
			defaultId: 0,
		});
		ipcRenderer.send('download-update');
		ipcRenderer.send('close-update-dialog');
	}, false);

	document.querySelector('.update-install-action').focus();
};

export default setupUpdateDialog;
