import { remote } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';

import {
	UPDATE_DIALOG_DISMISSED,
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
} from '../../actions';
import { useDialog } from '../../hooks/useDialog';
import {
	Actions,
	Arrow,
	Button,
	Content,
	CurrentVersion,
	Info,
	Label,
	Message,
	NewVersion,
	Title,
	Value,
	Wrapper,
} from './styles';

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

	return <Wrapper ref={dialogRef}>
		<Content>
			<Title>{t('dialog.update.announcement')}</Title>
			<Message>{t('dialog.update.message')}</Message>

			<Info>
				<CurrentVersion>
					<Label>{t('dialog.update.currentVersion')}</Label>
					<Value>{currentVersion}</Value>
				</CurrentVersion>
				<Arrow>&rarr;</Arrow>
				<NewVersion>
					<Label>{t('dialog.update.newVersion')}</Label>
					<Value>{newVersion}</Value>
				</NewVersion>
			</Info>
		</Content>

		<Actions>
			<Button type='button' secondary onClick={handleSkipButtonClick}>
				{t('dialog.update.skip')}
			</Button>
			<Button type='button' secondary onClick={handleRemindLaterButtonClick}>
				{t('dialog.update.remindLater')}
			</Button>
			<Button ref={installButtonRef} type='button' onClick={handleInstallButtonClick}>
				{t('dialog.update.install')}
			</Button>
		</Actions>
	</Wrapper>;
}
