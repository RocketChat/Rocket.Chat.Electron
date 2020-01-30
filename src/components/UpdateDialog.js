import { remote } from 'electron';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';

import {
	UPDATE_DIALOG_DISMISSED,
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
} from '../scripts/actions';

export function UpdateDialog({
	currentVersion = remote.app.getVersion(),
	newVersion,
	root = document.querySelector('.update-dialog'),
	visible = false,
	dispatch,
}) {
	const { t } = useTranslation();

	useEffect(() => {
		if (!visible) {
			root.close();
			return;
		}

		root.showModal();

		root.onclose = () => {
			root.close();
			dispatch({ type: UPDATE_DIALOG_DISMISSED });
		};

		root.onclick = ({ clientX, clientY }) => {
			const { left, top, width, height } = root.getBoundingClientRect();
			const isInDialog = top <= clientY && clientY <= top + height && left <= clientX && clientX <= left + width;
			if (!isInDialog) {
				root.close();
				dispatch({ type: UPDATE_DIALOG_DISMISSED });
			}
		};
	}, [visible]);

	const installButtonRef = useRef();

	useEffect(() => {
		installButtonRef.current.focus();
	}, []);

	const handleSkipButtonClick = async () => {
		await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'warning',
			title: t('dialog.updateSkip.title'),
			message: t('dialog.updateSkip.message'),
			buttons: [t('dialog.updateSkip.ok')],
			defaultId: 0,
		});
		dispatch({ type: UPDATE_DIALOG_SKIP_UPDATE_CLICKED, payload: newVersion });
		dispatch({ type: UPDATE_DIALOG_DISMISSED });
	};

	const handleRemindLaterButtonClick = () => {
		dispatch({ type: UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED });
		dispatch({ type: UPDATE_DIALOG_DISMISSED });
	};

	const handleInstallButtonClick = async () => {
		await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'info',
			title: t('dialog.updateDownloading.title'),
			message: t('dialog.updateDownloading.message'),
			buttons: [t('dialog.updateDownloading.ok')],
			defaultId: 0,
		});
		dispatch({ type: UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED });
		dispatch({ type: UPDATE_DIALOG_DISMISSED });
	};

	root.querySelector('.update-title').innerText = t('dialog.update.announcement');

	root.querySelector('.update-message').innerText = t('dialog.update.message');

	root.querySelector('.current-version .app-version-label').innerText = t('dialog.update.currentVersion');

	root.querySelector('.current-version .app-version-value').innerText = currentVersion;

	root.querySelector('.new-version .app-version-label').innerText = t('dialog.update.newVersion');

	root.querySelector('.new-version .app-version-value').innerText = newVersion;

	root.querySelector('.update-skip-action').innerText = t('dialog.update.skip');
	root.querySelector('.update-skip-action').onclick = handleSkipButtonClick;

	root.querySelector('.update-remind-action').innerText = t('dialog.update.remindLater');
	root.querySelector('.update-remind-action').onclick = handleRemindLaterButtonClick;

	installButtonRef.current = root.querySelector('.update-install-action');
	root.querySelector('.update-install-action').innerText = t('dialog.update.install');
	root.querySelector('.update-install-action').onclick = handleInstallButtonClick;

	return null;
}
