import { remote } from 'electron';
import i18n from 'i18next';
import React, { useEffect, useState, Component } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Provider, useDispatch } from 'react-redux';
import { call, put, select, takeEvery } from 'redux-saga/effects';

import {
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_OPEN_URL_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
	DEEP_LINK_TRIGGERED,
	DEEP_LINKS_SERVER_FOCUSED,
	DEEP_LINKS_SERVER_ADDED,
} from '../actions';
import { MainWindow } from './MainWindow';
import { AboutDialog } from './AboutDialog';
import { ScreenSharingDialog } from './ScreenSharingDialog';
import { UpdateDialog } from './UpdateDialog';
import { SideBar } from './SideBar';
import { ServersView } from './ServersView';
import { AddServerView } from './AddServerView';
import { TrayIcon } from './TrayIcon';
import { MenuBar } from './MenuBar';
import { Dock } from './Dock';
import { TouchBar } from './TouchBar';
import { createReduxStoreAndSagaMiddleware } from '../storeAndEffects';
import { SagaMiddlewareProvider, useSaga } from './SagaMiddlewareProvider';
import { validateServerUrl } from '../sagas/servers';
import { SelectClientCertificateDialog } from './SelectClientCertificateDialog';

function AppContent() {
	const { t } = useTranslation();

	useSaga(function *() {
		yield takeEvery([MENU_BAR_QUIT_CLICKED, TRAY_ICON_QUIT_CLICKED], function *() {
			remote.app.quit();
		});

		yield takeEvery(MENU_BAR_OPEN_URL_CLICKED, function *({ payload: url }) {
			remote.shell.openExternal(url);
		});
	}, []);

	useSaga(function *() {
		yield takeEvery(DEEP_LINK_TRIGGERED, function *({ payload: { url } }) {
			const servers = yield select(({ servers }) => servers);

			if (servers.some((server) => server.url === url)) {
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

			remote.app.relaunch({ args: [remote.process.argv[1], '--reset-app-data'] });
			remote.app.quit();
		});
	}, []);

	const dispatch = useDispatch();

	useEffect(() => {
		window.dispatch = dispatch;
	}, [dispatch]);

	return <MainWindow>
		<MenuBar />
		<SideBar />
		<ServersView />
		<AddServerView />
		<AboutDialog />
		<ScreenSharingDialog />
		<SelectClientCertificateDialog />
		<UpdateDialog />
		<Dock />
		<TrayIcon />
		<TouchBar />
	</MainWindow>;
}

class ErrorCatcher extends Component {
	componentDidCatch(error, errorInfo) {
		console.error(error);
		console.error(errorInfo.componentStack);
		remote.dialog.showErrorBox(error.message, error.stack);
		process.exit(1);
	}

	render() {
		return <>
			{this.props.children}
		</>;
	}
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
