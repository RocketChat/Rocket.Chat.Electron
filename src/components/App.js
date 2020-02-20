import { remote } from 'electron';
import i18n from 'i18next';
import React, { useEffect, useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Provider, useDispatch } from 'react-redux';
import { call, put, select, takeEvery } from 'redux-saga/effects';

import {
	CERTIFICATE_TRUST_REQUESTED,
	DEEP_LINK_TRIGGERED,
	DEEP_LINKS_SERVER_ADDED,
	DEEP_LINKS_SERVER_FOCUSED,
	MAIN_WINDOW_INSTALL_UPDATE_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	UPDATES_UPDATE_DOWNLOADED,
	WEBVIEW_CERTIFICATE_DENIED,
	WEBVIEW_CERTIFICATE_TRUSTED,
} from '../actions';
import { MainWindow } from './MainWindow';
import { TrayIcon } from './TrayIcon';
import { MenuBar } from './MenuBar';
import { Dock } from './Dock';
import { TouchBar } from './TouchBar';
import { createReduxStoreAndSagaMiddleware } from '../storeAndEffects';
import { SagaMiddlewareProvider, useSaga } from './SagaMiddlewareProvider';
import { validateServerUrl } from '../sagas/servers';
import { Shell } from './Shell';
import { ErrorCatcher } from './utils/ErrorCatcher';

function AppContent() {
	const { t } = useTranslation();

	useSaga(function *() {
		yield takeEvery(DEEP_LINK_TRIGGERED, function *({ payload: { url } }) {
			const isServerAlreadyAdded = yield select(({ servers }) => servers.some((server) => server.url === url));

			if (isServerAlreadyAdded) {
				yield put({ type: DEEP_LINKS_SERVER_FOCUSED, payload: url });
				return;
			}

			const { response } = yield call(::remote.dialog.showMessageBox, {
				type: 'question',
				buttons: [t('dialog.addServer.add'), t('dialog.addServer.cancel')],
				defaultId: 0,
				title: t('dialog.addServer.title'),
				message: t('dialog.addServer.message', { host: url }),
			});

			if (response === 0) {
				try {
					yield *validateServerUrl(url);
					yield put({ type: DEEP_LINKS_SERVER_ADDED, payload: url });
				} catch (error) {
					remote.dialog.showErrorBox(t('dialog.addServerError.title'), t('dialog.addServerError.message', { host: url }));
				}
			}
		});

		yield takeEvery(MENU_BAR_RESET_APP_DATA_CLICKED, function *() {
			const { response } = yield call(::remote.dialog.showMessageBox, {
				type: 'question',
				buttons: [t('dialog.resetAppData.yes'), t('dialog.resetAppData.cancel')],
				defaultId: 1,
				title: t('dialog.resetAppData.title'),
				message: t('dialog.resetAppData.message'),
			});

			if (response !== 0) {
				return;
			}

			const command = remote.process.argv.slice(0, remote.app.isPackaged ? 1 : 2);

			remote.app.relaunch({ args: [...command.slice(1), '--reset-app-data'] });
			remote.app.quit();
		});

		yield takeEvery(UPDATES_UPDATE_DOWNLOADED, function *() {
			const { response } = yield call(::remote.dialog.showMessageBox, remote.getCurrentWindow(), {
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
				yield call(::remote.dialog.showMessageBox, remote.getCurrentWindow(), {
					type: 'info',
					title: t('dialog.updateInstallLater.title'),
					message: t('dialog.updateInstallLater.message'),
					buttons: [t('dialog.updateInstallLater.ok')],
					defaultId: 0,
				});
				return;
			}

			yield put({ type: MAIN_WINDOW_INSTALL_UPDATE_CLICKED });
		});

		yield takeEvery(CERTIFICATE_TRUST_REQUESTED, function *({ payload }) {
			const { webContentsId, requestedUrl, error, fingerprint, issuerName, willBeReplaced } = payload;

			if (webContentsId !== remote.getCurrentWebContents().id) {
				return;
			}

			let detail = `URL: ${ requestedUrl }\nError: ${ error }`;
			if (willBeReplaced) {
				detail = t('error.differentCertificate', { detail });
			}

			const { response } = yield call(remote.dialog.showMessageBox, remote.getCurrentWindow(), {
				title: t('dialog.certificateError.title'),
				message: t('dialog.certificateError.message', { issuerName }),
				detail,
				type: 'warning',
				buttons: [
					t('dialog.certificateError.yes'),
					t('dialog.certificateError.no'),
				],
				cancelId: 1,
			});

			if (response === 0) {
				yield put({ type: WEBVIEW_CERTIFICATE_TRUSTED, payload: { webContentsId, fingerprint } });
				return;
			}

			yield put({ type: WEBVIEW_CERTIFICATE_DENIED, payload: { webContentsId, fingerprint } });
		});
	}, []);

	const dispatch = useDispatch();

	useEffect(() => {
		window.dispatch = dispatch;
	}, [dispatch]);

	return <MainWindow>
		<MenuBar />
		<Shell />
		<Dock />
		<TrayIcon />
		<TouchBar />
	</MainWindow>;
}

export function App() {
	const [[store, sagaMiddleware]] = useState(() => createReduxStoreAndSagaMiddleware());

	return <ErrorCatcher>
		<Provider store={store}>
			<SagaMiddlewareProvider sagaMiddleware={sagaMiddleware}>
				<I18nextProvider i18n={i18n}>
					<AppContent />
				</I18nextProvider>
			</SagaMiddlewareProvider>
		</Provider>
	</ErrorCatcher>;
}
