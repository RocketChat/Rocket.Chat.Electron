import { remote } from 'electron';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import {
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATES_CHECK_FAILED,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_READY,
} from '../actions';
import updates from '../services/updates';
import { useSaga } from './SagaMiddlewareProvider';

export function UpdatesProvider({ children, service = updates }) {
	const updates = service;

	const dispatch = useDispatch();

	const t = useTranslation();

	useEffect(() => {
		let checking = false;

		updates.addListener(updates.constants.CHECKING_EVENT, () => {
			checking = true;
		});

		updates.addListener(updates.constants.NOT_AVAILABLE_EVENT, () => {
			checking = false;
			dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
		});

		updates.addListener(updates.constants.SKIPPED_EVENT, () => {
			checking = false;
			dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
		});

		updates.addListener(updates.constants.AVAILABLE_EVENT, async (version) => {
			dispatch({ type: UPDATES_NEW_VERSION_AVAILABLE, payload: version });
		});

		updates.addListener(updates.constants.DOWNLOADED_EVENT, async () => {
			const { response } = await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				title: t('dialog.updateReady.title'),
				message: t('dialog.updateReady.message'),
				buttons: [
					t('dialog.updateReady.installLater'),
					t('dialog.updateReady.installNow'),
				],
				defaultId: 1,
			});

			if (response === 0) {
				await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'info',
					title: t('dialog.updateInstallLater.title'),
					message: t('dialog.updateInstallLater.message'),
					buttons: [t('dialog.updateInstallLater.ok')],
					defaultId: 0,
				});
				return;
			}

			remote.getCurrentWindow().removeAllListeners();
			remote.app.removeAllListeners('window-all-closed');
			updates.install();
		});

		updates.addListener(updates.constants.ERROR_EVENT, () => {
			if (checking) {
				dispatch({ type: UPDATES_CHECK_FAILED });
			}
		});

		updates.setUp().then(() => {
			dispatch({
				type: UPDATES_READY,
				payload: {
					updatesEnabled: updates.isEnabled(),
					updatesConfigurable: updates.isConfigurable(),
					checksForUpdatesOnStartup: updates.isCheckForUpdatesOnStartupEnabled(),
				},
			});
		});

		window.addEventListener('beforeunload', ::updates.tearDown);
		return ::updates.tearDown;
	}, []);

	useSaga(function *() {
		yield takeEvery(ABOUT_DIALOG_TOGGLE_UPDATE_ON_START, function *({ payload: updateOnStart }) {
			updates.toggleCheckOnStartup(updateOnStart);
		});

		yield takeEvery(ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED, function *() {
			updates.check();
		});

		yield takeEvery(UPDATE_DIALOG_SKIP_UPDATE_CLICKED, function *({ payload: skippedVersion }) {
			updates.skipVersion(skippedVersion);
		});

		yield takeEvery(UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED, function *() {
			updates.download();
		});
	}, []);

	return <>
		{children}
	</>;
}

export const useUpdatesParameters = () => {
	const checksForUpdatesOnStartup = useSelector(({ checksForUpdatesOnStartup }) => checksForUpdatesOnStartup);
	const updatesConfigurable = useSelector(({ updatesConfigurable }) => updatesConfigurable);
	const updatesEnabled = useSelector(({ updatesEnabled }) => updatesEnabled);

	return useMemo(() => ({
		checksForUpdatesOnStartup,
		updatesConfigurable,
		updatesEnabled,
	}), [checksForUpdatesOnStartup, updatesConfigurable, updatesEnabled]);
};
