import { remote } from 'electron';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import { useSaga } from '../components/SagaMiddlewareProvider';
import {
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_CHECK_FAILED,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
} from '../scripts/actions';
import updates from '../services/updates';

export const useUpdates = () => {
	const dispatch = useDispatch();

	const [updatesEnabled, setUpdatesEnabled] = useState(false);
	const [updatesConfigurable, setUpdatesConfigurable] = useState(false);
	const [checksForUpdatesOnStartup, setCheckForUpdatesOnStartup] = useState(false);

	const t = useTranslation();

	useEffect(() => {
		const subscribe = async () => {
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

			await updates.setUp();
			setUpdatesEnabled(updates.enabled);
			setUpdatesConfigurable(updates.configurable);
			setCheckForUpdatesOnStartup(updates.checkOnStartup);
		};

		const unsubscribe = async () => {
			await updates.tearDown();
		};

		subscribe();
		window.addEventListener('beforeunload', unsubscribe);
		return unsubscribe;
	}, []);

	useSaga(function *() {
		yield takeEvery(ABOUT_DIALOG_TOGGLE_UPDATE_ON_START, function *({ payload: updateOnStart }) {
			updates.toggleCheckOnStartup(updateOnStart);
			setCheckForUpdatesOnStartup(updates.checkOnStartup);
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

	return { updatesEnabled, checksForUpdatesOnStartup, updatesConfigurable };
};
