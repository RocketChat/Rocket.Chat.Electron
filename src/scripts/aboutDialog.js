const setupAboutDialog = () => {
	const { remote: { getCurrentWindow }, ipcRenderer } = require('electron');
	const { params: { appName, appVersion } } = getCurrentWindow();
	const i18n = require('../i18n');
	const { copyright } = require('../../package.json');

	document.title = i18n.__('dialog.about.title', { appName });
	document.querySelector('.app-version').innerHTML = `${ i18n.__('dialog.about.version') } <span class="version">${ appVersion }</span>`;
	document.querySelector('.check-for-updates').innerHTML = i18n.__('dialog.about.checkUpdates');
	document.querySelector('.check-for-updates-on-start + span').innerHTML = i18n.__('dialog.about.checkUpdatesOnStart');
	document.querySelector('.copyright').innerHTML = i18n.__('dialog.about.copyright', { copyright });

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

		document.querySelector('.check-for-updates').addEventListener('click', (e) => {
			e.preventDefault();
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

		ipcRenderer.on('update-result', (e, updateAvailable) => {
			if (updateAvailable) {
				resetUpdatesSection();
				return;
			}

			document.querySelector('.checking-for-updates .message').innerHTML = i18n.__('dialog.about.noUpdatesAvailable');
			document.querySelector('.checking-for-updates').classList.add('message-shown');

			setTimeout(() => {
				resetUpdatesSection();
				document.querySelector('.checking-for-updates .message').innerHTML = '';
				document.querySelector('.checking-for-updates').classList.remove('message-shown');
			}, 5000);
		});

		ipcRenderer.on('update-error', () => {
			document.querySelector('.checking-for-updates .message').innerHTML = i18n.__('dialog.about.errorWhileLookingForUpdates');
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
