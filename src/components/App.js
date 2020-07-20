import { remote } from 'electron';
import i18n from 'i18next';
import React, { useEffect, useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Provider, useDispatch } from 'react-redux';
import { call, put, select, takeEvery } from 'redux-saga/effects';

import {
	DEEP_LINK_TRIGGERED,
	DEEP_LINKS_SERVER_ADDED,
	DEEP_LINKS_SERVER_FOCUSED,
} from '../actions';
import { MainWindow } from './MainWindow';
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
	}, [t]);

	const dispatch = useDispatch();

	useEffect(() => {
		window.dispatch = dispatch;
	}, [dispatch]);

	return <MainWindow>
		<Shell />
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
