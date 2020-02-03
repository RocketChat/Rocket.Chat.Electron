import { remote } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import pkg from '../../package.json';
import {
	ABOUT_DIALOG_DISMISSED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_CHECK_FAILED,
} from '../actions.js';
import { useSaga } from './SagaMiddlewareProvider';
import { useUpdatesParameters } from './UpdatesProvider.js';

export function AboutDialog({
	appVersion = remote.app.getVersion(),
	copyright = pkg.copyright,
	visible = false,
}) {
	const {
		updatesEnabled: canUpdate = false,
		checksForUpdatesOnStartup: canAutoUpdate = false,
		updatesConfigurable: canSetAutoUpdate = false,
	} = useUpdatesParameters();

	const rootRef = useRef();
	const dispatch = useDispatch();

	useEffect(() => {
		const root = rootRef.current;

		if (!visible) {
			root.close();
			return;
		}

		root.showModal();

		root.onclose = () => {
			root.close();
			dispatch({ type: ABOUT_DIALOG_DISMISSED });
		};

		root.onclick = ({ clientX, clientY }) => {
			const { left, top, width, height } = root.getBoundingClientRect();
			const isInDialog = top <= clientY && clientY <= top + height && left <= clientX && clientX <= left + width;
			if (!isInDialog) {
				root.close();
				dispatch({ type: ABOUT_DIALOG_DISMISSED });
			}
		};
	}, [rootRef, visible, dispatch]);

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

		yield takeEvery(UPDATES_CHECK_FAILED, function *() {
			displayCheckingForUpdatesMessage(t('dialog.about.errorWhileLookingForUpdates'));
		});
	}, [canUpdate]);

	const handleCheckForUpdatesButtonClick = () => {
		setCheckingForUpdates(true);
		setCheckingForUpdatesMessage(null);
		dispatch({ type: ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED });
	};

	const handleCheckForUpdatesOnStartCheckBoxChange = (event) => {
		dispatch({ type: ABOUT_DIALOG_TOGGLE_UPDATE_ON_START, payload: event.target.checked });
	};

	return <dialog ref={rootRef} className='about-dialog'>
		<section className='app-info'>
			<div className='app-logo'>
				<img src='./images/logo.svg' />
			</div>
			<div className='app-version'>
				{t('dialog.about.version')} <span className='version'>{appVersion}</span>
			</div>
		</section>

		<section className={['updates', !canUpdate && 'hidden'].filter(Boolean).join(' ')}>
			<button
				type='button'
				className={[
					'check-for-updates',
					'button',
					'primary',
					checkingForUpdates && 'hidden',
				].filter(Boolean).join(' ')}
				disabled={checkingForUpdates}
				onClick={handleCheckForUpdatesButtonClick}
			>
				{t('dialog.about.checkUpdates')}
			</button>

			<div
				className={[
					'checking-for-updates',
					!checkingForUpdates && 'hidden',
					!!checkingForUpdatesMessage && 'message-shown',
				].filter(Boolean).join(' ')}
			>
				<span className='dot'></span>
				<span className='dot'></span>
				<span className='dot'></span>
				<span className='message'>{checkingForUpdatesMessage}</span>
			</div>

			<label className='check-for-updates-on-start__label'>
				<input
					className='check-for-updates-on-start'
					type='checkbox'
					checked={canAutoUpdate}
					disabled={!canSetAutoUpdate}
					onChange={handleCheckForUpdatesOnStartCheckBoxChange}
				/>
				<span>{t('dialog.about.checkUpdatesOnStart')}</span>
			</label>
		</section>

		<div className='copyright'>
			{t('dialog.about.copyright', { copyright })}
		</div>
	</dialog>;
}
