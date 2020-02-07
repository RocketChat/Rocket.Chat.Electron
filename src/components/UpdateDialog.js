import { remote } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';

import {
	UPDATE_DIALOG_DISMISSED,
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
} from '../actions';
import { useDialog } from '../hooks/useDialog';

export function UpdateDialog({
	currentVersion = remote.app.getVersion(),
	newVersion = null,
	visible = false,
}) {
	const dispatch = useDispatch();
	const dialogRef = useDialog(visible, () => {
		dispatch({ type: UPDATE_DIALOG_DISMISSED });
	});

	const { t } = useTranslation();

	const installButtonRef = useRef();

	useEffect(() => {
		if (!visible) {
			return;
		}

		installButtonRef.current.focus();
	}, [visible]);

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

	return <dialog ref={dialogRef} className='update-dialog'>
		<div className='update-content'>
			<h1 className='update-title'>{t('dialog.update.announcement')}</h1>
			<p className='update-message'>{t('dialog.update.message')}</p>

			<div className='update-info'>
				<div className='app-version current-version'>
					<div className='app-version-label'>{t('dialog.update.currentVersion')}</div>
					<div className='app-version-value'>{currentVersion}</div>
				</div>
				<div className='update-arrow'>&rarr;</div>
				<div className='app-version new-version'>
					<div className='app-version-label'>{t('dialog.update.newVersion')}</div>
					<div className='app-version-value'>{newVersion}</div>
				</div>
			</div>
		</div>

		<div className='update-actions'>
			<button type='button' className='update-skip-action button secondary' onClick={handleSkipButtonClick}>
				{t('dialog.update.skip')}
			</button>
			<button type='button' className='update-remind-action button secondary' onClick={handleRemindLaterButtonClick}>
				{t('dialog.update.remindLater')}
			</button>
			<button ref={installButtonRef} type='button' className='update-install-action button primary' onClick={handleInstallButtonClick}>
				{t('dialog.update.install')}
			</button>
		</div>
	</dialog>;
}
