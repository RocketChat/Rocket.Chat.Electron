import { Box, Button, ButtonGroup, Chevron, Flex, Margins } from '@rocket.chat/fuselage';
import { remote } from 'electron';
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
	};

	return <Dialog isVisible={isVisible} onClose={() => dispatch({ type: UPDATE_DIALOG_DISMISSED })}>
		<Flex.Container direction='column' alignItems='center'>
			<Box>
				<Margins block='x8'>
					<Box textStyle='h1'>{t('dialog.update.announcement')}</Box>
					<Box>{t('dialog.update.message')}</Box>
				</Margins>

				<Margins block='x32'>
					<Flex.Container alignItems='center' justifyContent='center'>
						<Box>
							<Margins inline='x16'>
								<Flex.Container direction='column' alignItems='center'>
									<Box textColor='info'>
										<Box>{t('dialog.update.currentVersion')}</Box>
										<Box textStyle='p2'>{currentVersion}</Box>
									</Box>
								</Flex.Container>
								<Chevron right size='32' />
								<Flex.Container direction='column' alignItems='center'>
									<Box>
										<Box>{t('dialog.update.newVersion')}</Box>
										<Box textStyle='p2'>{newVersion}</Box>
									</Box>
								</Flex.Container>
							</Margins>
						</Box>
					</Flex.Container>
				</Margins>
			</Box>
		</Flex.Container>

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
