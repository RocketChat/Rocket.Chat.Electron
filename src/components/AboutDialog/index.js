import { Box, Button, Field, Flex, Loading, Margins, ToggleSwitch } from '@rocket.chat/fuselage';
import { useUniqueId } from '@rocket.chat/fuselage-hooks';
import { remote } from 'electron';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import pkg from '../../../package.json';
import {
	ABOUT_DIALOG_DISMISSED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_ERROR_THROWN,
	UPDATES_CHECKING_FOR_UPDATE,
} from '../../actions';
import { RocketChatLogo } from '../RocketChatLogo.js';
import { useSaga } from '../SagaMiddlewareProvider';
import { Dialog } from '../Dialog/index.js';

export function AboutDialog() {
	const version = useMemo(() => remote.app.getVersion(), []);
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

	useSaga(function *() {
		if (!canUpdate) {
			return;
		}

		yield takeEvery(UPDATES_NEW_VERSION_AVAILABLE, function *() {
			setCheckingForUpdates(false);
			setCheckingForUpdatesMessage(null);
		});

		yield takeEvery(UPDATES_NEW_VERSION_NOT_AVAILABLE, function *() {
			displayCheckingForUpdatesMessage(t('dialog.about.noUpdatesAvailable'));
		});

		yield takeEvery(UPDATES_CHECKING_FOR_UPDATE, function *() {
			setCheckingForUpdates(true);
			setCheckingForUpdatesMessage(null);
		});

		yield takeEvery(UPDATES_ERROR_THROWN, function *() {
			if (checkingForUpdates) {
				displayCheckingForUpdatesMessage(t('dialog.about.errorWhenLookingForUpdates'));
			}
		});
	}, [canUpdate, checkingForUpdates]);

	const handleCheckForUpdatesButtonClick = () => {
		dispatch({ type: ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED });
	};

	const handleCheckForUpdatesOnStartCheckBoxChange = (event) => {
		dispatch({ type: ABOUT_DIALOG_TOGGLE_UPDATE_ON_START, payload: event.target.checked });
	};

	const checkForUpdatesButtonRef = useRef();

	useEffect(() => {
		if (!isVisible || !checkForUpdatesButtonRef.current) {
			return;
		}

		checkForUpdatesButtonRef.current.focus();
	}, [isVisible]);

	const checkForUpdatesOnStartupToggleSwitchId = useUniqueId();

	return <Dialog isVisible={isVisible} onClose={() => dispatch({ type: ABOUT_DIALOG_DISMISSED })}>
		<Margins block='x16'>
			<RocketChatLogo />

			<Flex.Item align='center'>
				<Box>
					<Trans i18nKey='dialog.about.version' version={version}>
							Version: <Box is='span' textStyle='p2' style={{ userSelect: 'text' }}>{{ version }}</Box>
					</Trans>
				</Box>
			</Flex.Item>

			{canUpdate && <Flex.Container direction='column'>
				<Box>
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
									? <Box textStyle='c1' textColor='info'>{checkingForUpdatesMessage}</Box>
									: <Loading size='x16' />}
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
				</Box>
			</Flex.Container>}

			<Flex.Item align='center'>
				<Box textStyle='micro'>
					{t('dialog.about.copyright', { copyright })}
				</Box>
			</Flex.Item>
		</Margins>
	</Dialog>;
}
