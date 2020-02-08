import { remote } from 'electron';
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import pkg from '../../../package.json';
import { useDialog } from '../../hooks/useDialog.js';
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
import {
	AppInfo,
	AppVersion,
	CheckForUpdatesButton,
	CheckForUpdatesOnStartupInput,
	CheckForUpdatesOnStartupLabel,
	Copyright,
	LoadingIndicator,
	LoadingIndicatorDot,
	LoadingIndicatorMessage,
	Updates,
	Version,
	Wrapper,
} from './styles.js';

export function AboutDialog({
	appVersion = remote.app.getVersion(),
	copyright = pkg.copyright,
	visible = false,
}) {
	const canUpdate = useSelector(({ isUpdatingAllowed, isUpdatingEnabled }) => isUpdatingAllowed && isUpdatingEnabled);
	const isCheckForUpdatesOnStartupChecked = useSelector(({
		isUpdatingAllowed,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
	}) => isUpdatingAllowed && isUpdatingEnabled && doCheckForUpdatesOnStartup);
	const canSetCheckForUpdatesOnStartup = useSelector(({ isUpdatingAllowed, isEachUpdatesSettingConfigurable }) =>
		isUpdatingAllowed && isEachUpdatesSettingConfigurable);

	const dispatch = useDispatch();

	const dialogRef = useDialog(visible, () => {
		dispatch({ type: ABOUT_DIALOG_DISMISSED });
	});

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
				displayCheckingForUpdatesMessage(t('dialog.about.errorWhileLookingForUpdates'));
			}
		});
	}, [canUpdate, checkingForUpdates]);

	const handleCheckForUpdatesButtonClick = () => {
		dispatch({ type: ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED });
	};

	const handleCheckForUpdatesOnStartCheckBoxChange = (event) => {
		dispatch({ type: ABOUT_DIALOG_TOGGLE_UPDATE_ON_START, payload: event.target.checked });
	};

	return <Wrapper ref={dialogRef}>
		<AppInfo>
			<RocketChatLogo />
			<AppVersion>
				{t('dialog.about.version')} <Version>{appVersion}</Version>
			</AppVersion>
		</AppInfo>

		{canUpdate && <Updates>
			{!checkingForUpdates && <CheckForUpdatesButton
				type='button'
				disabled={checkingForUpdates}
				onClick={handleCheckForUpdatesButtonClick}
			>
				{t('dialog.about.checkUpdates')}
			</CheckForUpdatesButton>}

			{checkingForUpdates && <LoadingIndicator>
				{checkingForUpdatesMessage
					? <LoadingIndicatorMessage>{checkingForUpdatesMessage}</LoadingIndicatorMessage>
					: <>
						<LoadingIndicatorDot />
						<LoadingIndicatorDot />
						<LoadingIndicatorDot />
					</>}
			</LoadingIndicator>}

			<CheckForUpdatesOnStartupLabel>
				<CheckForUpdatesOnStartupInput
					type='checkbox'
					checked={isCheckForUpdatesOnStartupChecked}
					disabled={!canSetCheckForUpdatesOnStartup}
					onChange={handleCheckForUpdatesOnStartCheckBoxChange}
				/>
				{t('dialog.about.checkUpdatesOnStart')}
			</CheckForUpdatesOnStartupLabel>
		</Updates>}

		<Copyright>
			{t('dialog.about.copyright', { copyright })}
		</Copyright>
	</Wrapper>;
}
