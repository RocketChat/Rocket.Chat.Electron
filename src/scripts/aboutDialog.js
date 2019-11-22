import { remote, ipcRenderer } from 'electron';
import { t } from 'i18next';

import pkg from '../../package.json';
import { useEffect, useState, useRef, useRoot } from './reactiveUi.js';
import { createDialog, destroyDialog } from './dialogs.js';

const { app } = remote;

export function AboutDialog({
	appVersion,
	copyright,
	canUpdate,
	canAutoUpdate,
	canSetAutoUpdate,
}) {
	const [checkingForUpdates, setCheckingForUpdates] = useState(false);
	const [checkingForUpdatesMessage, setCheckingForUpdatesMessage] = useState(null);

	const checkingForUpdatesMessageTimerRef = useRef();

	const displayCheckingForUpdatesMessage = (message) => {
		setCheckingForUpdatesMessage(message);

		clearTimeout(checkingForUpdatesMessageTimerRef.current);
		checkingForUpdatesMessageTimerRef.current = setTimeout(() => {
			setCheckingForUpdates(false);
			setCheckingForUpdatesMessage(null);
		}, 5000);
	};

	useEffect(() => {
		if (!canUpdate) {
			return;
		}

		const handleUpdateResult = (_, updateAvailable) => {
			if (updateAvailable) {
				setCheckingForUpdates(false);
				setCheckingForUpdatesMessage(null);
				return;
			}

			displayCheckingForUpdatesMessage(t('dialog.about.noUpdatesAvailable'));
		};

		const handleUpdateError = () => {
			displayCheckingForUpdatesMessage(t('dialog.about.errorWhileLookingForUpdates'));
		};

		ipcRenderer.on('update-result', handleUpdateResult);
		ipcRenderer.on('update-error', handleUpdateError);

		return () => {
			ipcRenderer.removeListener('update-result', handleUpdateResult);
			ipcRenderer.removeListener('update-error', handleUpdateError);
		};
	}, [canUpdate]);

	const handleCheckForUpdatesButtonClick = () => {
		setCheckingForUpdates(true);
		setCheckingForUpdatesMessage(null);
		ipcRenderer.send('check-for-updates', { forced: true });
	};

	const handleCheckForUpdatesOnStartCheckBoxChange = (event) => {
		ipcRenderer.send('set-auto-update', event.target.checked);
	};

	const root = useRoot();

	root.querySelector('.app-version').innerHTML = `${ t('dialog.about.version') } <span class="version">${ appVersion }</span>`;

	root.querySelector('.check-for-updates').innerText = t('dialog.about.checkUpdates');
	root.querySelector('.check-for-updates').onclick = handleCheckForUpdatesButtonClick;
	root.querySelector('.check-for-updates').toggleAttribute('disabled', checkingForUpdates);
	root.querySelector('.check-for-updates').classList.toggle('hidden', checkingForUpdates);

	root.querySelector('.checking-for-updates').classList.toggle('hidden', !checkingForUpdates);
	root.querySelector('.checking-for-updates').classList.toggle('message-shown', !!checkingForUpdatesMessage);

	root.querySelector('.checking-for-updates .message').innerText = checkingForUpdatesMessage || '';

	root.querySelector('.check-for-updates-on-start').toggleAttribute('checked', canAutoUpdate);
	root.querySelector('.check-for-updates-on-start').toggleAttribute('disabled', !canSetAutoUpdate);
	root.querySelector('.check-for-updates-on-start').onchange = handleCheckForUpdatesOnStartCheckBoxChange;

	root.querySelector('.check-for-updates-on-start + span').innerText = t('dialog.about.checkUpdatesOnStart');

	root.querySelector('.copyright').innerText = t('dialog.about.copyright', { copyright });

	root.querySelector('.updates').classList.toggle('hidden', !canUpdate);

	return null;
}

export const openAboutDialog = async () => {
	createDialog({
		name: 'about-dialog',
		component: AboutDialog,
		createProps: async () => {
			const appVersion = app.getVersion();
			const { copyright } = pkg;
			const canUpdate = await ipcRenderer.invoke('can-update');
			const canAutoUpdate = canUpdate && await ipcRenderer.invoke('can-auto-update');
			const canSetAutoUpdate = canUpdate && await ipcRenderer.invoke('can-set-auto-update');

			return {
				appVersion,
				copyright,
				canUpdate,
				canAutoUpdate,
				canSetAutoUpdate,
			};
		},
	});
};

export const closeAboutDialog = () => {
	destroyDialog('about-dialog');
};
