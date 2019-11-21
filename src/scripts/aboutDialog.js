import { remote, ipcRenderer } from 'electron';
import { t } from 'i18next';

import pkg from '../../package.json';

const { app } = remote;

const setupAboutDialog = () => {
	const appName = app.name;
	const appVersion = app.getVersion();
	const { copyright } = pkg;

	document.title = t('dialog.about.title', { appName });
	document.querySelector('.app-version').innerHTML = `${ t('dialog.about.version') } <span class="version">${ appVersion }</span>`;
	document.querySelector('.check-for-updates').innerHTML = t('dialog.about.checkUpdates');
	document.querySelector('.check-for-updates-on-start + span').innerHTML = t('dialog.about.checkUpdatesOnStart');
	document.querySelector('.copyright').innerHTML = t('dialog.about.copyright', { copyright });

	const canUpdate = ipcRenderer.sendSync('can-update');

	if (canUpdate) {
		const canAutoUpdate = ipcRenderer.sendSync('can-auto-update');

		if (canAutoUpdate) {
			document.querySelector('.check-for-updates-on-start').setAttribute('checked', 'checked');
		} else {
			document.querySelector('.check-for-updates-on-start').removeAttribute('checked');
		}

		const canSetAutoUpdate = ipcRenderer.sendSync('can-set-auto-update');
		if (canSetAutoUpdate) {
			document.querySelector('.check-for-updates-on-start').addEventListener('change', (event) => {
				ipcRenderer.send('set-auto-update', event.target.checked);
			});
		} else {
			document.querySelector('.check-for-updates-on-start').setAttribute('disabled', 'disabled');
		}

		document.querySelector('.check-for-updates').addEventListener('click', (event) => {
			event.preventDefault();
			document.querySelector('.check-for-updates').setAttribute('disabled', 'disabled');
			document.querySelector('.check-for-updates').classList.add('hidden');
			document.querySelector('.checking-for-updates').classList.remove('hidden');
			ipcRenderer.send('check-for-updates', { forced: true });
		}, false);

		const resetUpdatesSection = () => {
			document.querySelector('.check-for-updates').removeAttribute('disabled');
			document.querySelector('.check-for-updates').classList.remove('hidden');
			document.querySelector('.checking-for-updates').classList.add('hidden');
		};

		ipcRenderer.on('update-result', (_, updateAvailable) => {
			if (updateAvailable) {
				resetUpdatesSection();
				return;
			}

			document.querySelector('.checking-for-updates .message').innerHTML = t('dialog.about.noUpdatesAvailable');
			document.querySelector('.checking-for-updates').classList.add('message-shown');

			setTimeout(() => {
				resetUpdatesSection();
				document.querySelector('.checking-for-updates .message').innerHTML = '';
				document.querySelector('.checking-for-updates').classList.remove('message-shown');
			}, 5000);
		});

		ipcRenderer.on('update-error', () => {
			document.querySelector('.checking-for-updates .message').innerHTML = t('dialog.about.errorWhileLookingForUpdates');
			document.querySelector('.checking-for-updates').classList.add('message-shown');

			setTimeout(() => {
				resetUpdatesSection();
				document.querySelector('.checking-for-updates .message').innerHTML = '';
				document.querySelector('.checking-for-updates').classList.remove('message-shown');
			}, 5000);
		});

		document.querySelector('.updates').classList.remove('hidden');
	}
};

export default setupAboutDialog;
