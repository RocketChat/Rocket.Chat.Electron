import { Box, Button, ButtonGroup, Chevron, Margins } from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import {
	UPDATE_DIALOG_DISMISSED,
	UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
} from '../../actions';
import { EVENT_UPDATE_DOWNLOAD_ALLOWED, EVENT_UPDATE_SKIPPED } from '../../ipc';
import { Dialog } from '../Dialog';

export function UpdateDialog() {
	const currentVersion = useSelector(({ appVersion }) => appVersion);
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

	const handleSkipButtonClick = () => {
		ipcRenderer.send(EVENT_UPDATE_SKIPPED, newVersion);
	};

	const handleRemindLaterButtonClick = () => {
		dispatch({ type: UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED });
	};

	const handleInstallButtonClick = () => {
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
