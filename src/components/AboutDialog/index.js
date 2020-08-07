import { Box, Button, Field, Margins, Throbber, ToggleSwitch } from '@rocket.chat/fuselage';
import { useUniqueId, useAutoFocus } from '@rocket.chat/fuselage-hooks';
import { ipcRenderer } from 'electron';
import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { copyright } from '../../../package.json';
import {
	ABOUT_DIALOG_DISMISSED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
} from '../../actions';
import { EVENT_CHECK_FOR_UPDATES_REQUESTED } from '../../ipc';
import { Dialog } from '../Dialog';
import { RocketChatLogo } from '../RocketChatLogo';

export function AboutDialog() {
	const version = useSelector(({ appVersion }) => appVersion);
	const isVisible = useSelector(({ openDialog }) => openDialog === 'about');
	const canUpdate = useSelector(({ isUpdatingAllowed, isUpdatingEnabled }) => isUpdatingAllowed && isUpdatingEnabled);
	const isCheckForUpdatesOnStartupChecked = useSelector(({
		isUpdatingAllowed,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
	}) => isUpdatingAllowed && isUpdatingEnabled && doCheckForUpdatesOnStartup);
	const canSetCheckForUpdatesOnStartup = useSelector(({ isUpdatingAllowed, isEachUpdatesSettingConfigurable }) =>
		isUpdatingAllowed && isEachUpdatesSettingConfigurable);
	const updateError = useSelector(({ updateError }) => updateError);
	const isCheckingForUpdates = useSelector(({ isCheckingForUpdates }) => isCheckingForUpdates);
	const newUpdateVersion = useSelector(({ newUpdateVersion }) => newUpdateVersion);

	const dispatch = useDispatch();

	const { t } = useTranslation();

	const [[checkingForUpdates, checkingForUpdatesMessage], setCheckingForUpdates] = useState([false, null]);

	useEffect(() => {
		console.log(updateError, isCheckingForUpdates, newUpdateVersion);
		if (updateError) {
			setCheckingForUpdates([true, t('dialog.about.errorWhenLookingForUpdates')]);

			const messageTimer = setTimeout(() => {
				setCheckingForUpdates([false, null]);
			}, 5000);

			return () => {
				clearTimeout(messageTimer);
			};
		}

		if (isCheckingForUpdates) {
			setCheckingForUpdates([true, null]);
			return;
		}

		if (newUpdateVersion) {
			setCheckingForUpdates([false, null]);
			return;
		}

		setCheckingForUpdates([true, t('dialog.about.noUpdatesAvailable')]);
		const messageTimer = setTimeout(() => {
			setCheckingForUpdates([false, null]);
		}, 5000);

		return () => {
			clearTimeout(messageTimer);
		};
	}, [updateError, isCheckingForUpdates, newUpdateVersion, t]);

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
