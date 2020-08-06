import { Box, Button, Field, Margins, Throbber, ToggleSwitch } from '@rocket.chat/fuselage';
import { useUniqueId, useAutoFocus } from '@rocket.chat/fuselage-hooks';
import { ipcRenderer } from 'electron';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import pkg from '../../../package.json';
import {
	ABOUT_DIALOG_DISMISSED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_ERROR_THROWN,
	UPDATES_CHECKING_FOR_UPDATE,
} from '../../actions';
import {
	EVENT_CHECK_FOR_UPDATES_REQUESTED,
	QUERY_APP_VERSION,
} from '../../ipc';
import { Dialog } from '../Dialog';
import { RocketChatLogo } from '../RocketChatLogo';

export function AboutDialog() {
	const [version, setVersion] = useState('');

	useEffect(() => {
		ipcRenderer.invoke(QUERY_APP_VERSION).then((version) => {
			setVersion(version);
		});
	}, []);

	const { copyright } = pkg;
	const isVisible = useSelector(({ openDialog }) => openDialog === 'about');
	const canUpdate = useSelector(({ isUpdatingAllowed, isUpdatingEnabled }) => isUpdatingAllowed && isUpdatingEnabled);
	const isCheckForUpdatesOnStartupChecked = useSelector(({
		isUpdatingAllowed,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
	}) => isUpdatingAllowed && isUpdatingEnabled && doCheckForUpdatesOnStartup);
	const canSetCheckForUpdatesOnStartup = useSelector(({ isUpdatingAllowed, isEachUpdatesSettingConfigurable }) =>
		isUpdatingAllowed && isEachUpdatesSettingConfigurable);

	const dispatch = useDispatch();

	const { t } = useTranslation();

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

		const handleNewVersionAvailable = () => {
			setCheckingForUpdates(false);
			setCheckingForUpdatesMessage(null);
		};

		const handleNewVersionNotAvailable = () => {
			displayCheckingForUpdatesMessage(t('dialog.about.noUpdatesAvailable'));
		};

		const handleCheckingForUpdate = () => {
			setCheckingForUpdates(true);
			setCheckingForUpdatesMessage(null);
		};

		const handleErrorThrown = () => {
			if (checkingForUpdates) {
				displayCheckingForUpdatesMessage(t('dialog.about.errorWhenLookingForUpdates'));
			}
		};

		ipcRenderer.addListener(UPDATES_NEW_VERSION_AVAILABLE, handleNewVersionAvailable);
		ipcRenderer.addListener(UPDATES_NEW_VERSION_NOT_AVAILABLE, handleNewVersionNotAvailable);
		ipcRenderer.addListener(UPDATES_CHECKING_FOR_UPDATE, handleCheckingForUpdate);
		ipcRenderer.addListener(UPDATES_ERROR_THROWN, handleErrorThrown);

		return () => {
			ipcRenderer.removeListener(UPDATES_NEW_VERSION_AVAILABLE, handleNewVersionAvailable);
			ipcRenderer.removeListener(UPDATES_NEW_VERSION_NOT_AVAILABLE, handleNewVersionNotAvailable);
			ipcRenderer.removeListener(UPDATES_CHECKING_FOR_UPDATE, handleCheckingForUpdate);
			ipcRenderer.removeListener(UPDATES_ERROR_THROWN, handleErrorThrown);
		};
	}, [canUpdate, checkingForUpdates, t]);

	const handleCheckForUpdatesButtonClick = () => {
		ipcRenderer.send(EVENT_CHECK_FOR_UPDATES_REQUESTED);
	};

	const handleCheckForUpdatesOnStartCheckBoxChange = (event) => {
		dispatch({ type: ABOUT_DIALOG_TOGGLE_UPDATE_ON_START, payload: event.target.checked });
	};

	const checkForUpdatesButtonRef = useAutoFocus(isVisible);

	const checkForUpdatesOnStartupToggleSwitchId = useUniqueId();

	return <Dialog isVisible={isVisible} onClose={() => dispatch({ type: ABOUT_DIALOG_DISMISSED })}>
		<Margins block='x16'>
			<RocketChatLogo />

			<Box alignSelf='center'>
				<Trans i18nKey='dialog.about.version' version={version}>
						Version: <Box is='span' fontScale='p2' style={{ userSelect: 'text' }}>{{ version }}</Box>
				</Trans>
			</Box>

			{canUpdate && <Box display='flex' flexDirection='column'>
				<Margins block='x8'>
					{!checkingForUpdates && <Button
						ref={checkForUpdatesButtonRef}
						primary
						type='button'
						disabled={checkingForUpdates}
						onClick={handleCheckForUpdatesButtonClick}
					>
						{t('dialog.about.checkUpdates')}
					</Button>}
				</Margins>

				<Margins inline='auto' block='x8'>
					{checkingForUpdates && <Box>
						<Margins block='x12'>
							{checkingForUpdatesMessage
								? <Box fontScale='c1' color='info'>{checkingForUpdatesMessage}</Box>
								: <Throbber size='x16' />}
						</Margins>
					</Box>}

					<Field.Row>
						<ToggleSwitch
							id={checkForUpdatesOnStartupToggleSwitchId}
							checked={isCheckForUpdatesOnStartupChecked}
							disabled={!canSetCheckForUpdatesOnStartup}
							onChange={handleCheckForUpdatesOnStartCheckBoxChange}
						/>
						<Field.Label htmlFor={checkForUpdatesOnStartupToggleSwitchId}>
							{t('dialog.about.checkUpdatesOnStart')}
						</Field.Label>
					</Field.Row>
				</Margins>
			</Box>}

			<Box alignSelf='center' fontScale='micro'>
				{t('dialog.about.copyright', { copyright })}
			</Box>
		</Margins>
	</Dialog>;
}
