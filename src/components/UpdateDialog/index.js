import { Box, Button, ButtonGroup, Chevron, Margins } from '@rocket.chat/fuselage';
import { remote, ipcRenderer } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
	UPDATE_DIALOG_DISMISSED,
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
} from '../../actions';
import { Dialog } from '../Dialog';
import { EVENT_UPDATE_DOWNLOAD_ALLOWED } from '../../ipc';

export function UpdateDialog() {
	const currentVersion = useMemo(() => remote.app.getVersion(), []);
	const newVersion = useSelector(({ newUpdateVersion }) => newUpdateVersion);
	const isVisible = useSelector(({ openDialog }) => openDialog === 'update');

	const dispatch = useDispatch();

	const { t } = useTranslation();

	const installButtonRef = useRef();

	useEffect(() => {
		if (!isVisible) {
			return;
		}

		installButtonRef.current.focus();
	}, [isVisible]);

	const handleSkipButtonClick = async () => {
		await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'warning',
			title: t('dialog.updateSkip.title'),
			message: t('dialog.updateSkip.message'),
			buttons: [t('dialog.updateSkip.ok')],
			defaultId: 0,
		});
		dispatch({ type: UPDATE_DIALOG_SKIP_UPDATE_CLICKED, payload: newVersion });
	};

	const handleRemindLaterButtonClick = () => {
		dispatch({ type: UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED });
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
		ipcRenderer.send(EVENT_UPDATE_DOWNLOAD_ALLOWED);
	};

	return <Dialog isVisible={isVisible} onClose={() => dispatch({ type: UPDATE_DIALOG_DISMISSED })}>
		<Box display='flex' flexDirection='column' alignItems='center'>
			<Margins block='x8'>
				<Box fontScale='h1'>{t('dialog.update.announcement')}</Box>
				<Box>{t('dialog.update.message')}</Box>
			</Margins>

			<Margins block='x32'>
				<Box display='flex' alignItems='center' justifyContent='center'>
					<Margins inline='x16'>
						<Box display='flex' flexDirection='column' alignItems='center' color='info'>
							<Box>{t('dialog.update.currentVersion')}</Box>
							<Box fontScale='p2'>{currentVersion}</Box>
						</Box>
						<Chevron right size='32' />
						<Box display='flex' flexDirection='column' alignItems='center'>
							<Box>{t('dialog.update.newVersion')}</Box>
							<Box fontScale='p2'>{newVersion}</Box>
						</Box>
					</Margins>
				</Box>
			</Margins>
		</Box>

		<ButtonGroup>
			<Button type='button' onClick={handleSkipButtonClick}>
				{t('dialog.update.skip')}
			</Button>
			<Button type='button' onClick={handleRemindLaterButtonClick}>
				{t('dialog.update.remindLater')}
			</Button>
			<Button ref={installButtonRef} type='button' primary onClick={handleInstallButtonClick}>
				{t('dialog.update.install')}
			</Button>
		</ButtonGroup>
	</Dialog>;
}
