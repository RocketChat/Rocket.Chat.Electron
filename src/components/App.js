import { remote } from 'electron';
import i18n from 'i18next';
import React, { useEffect, useState, useMemo, Component } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { call, put, select, take, takeEvery } from 'redux-saga/effects';

import {
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_OPEN_URL_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_TOGGLE_SETTING_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
	MAIN_WINDOW_STATE_CHANGED,
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

	const [showWindowOnUnreadChanged, setShowWindowOnUnreadChanged] =	useState(() => localStorage.getItem('showWindowOnUnreadChanged') === 'true');
	const [hasTrayIcon, setHasTrayIcon] =	useState(() => (localStorage.getItem('hideTray') ? localStorage.getItem('hideTray') !== 'true' : process.platform !== 'linux'));
	const [hasMenuBar, setHasMenuBar] = useState(() => localStorage.getItem('autohideMenu') !== 'true');
	const [hasSidebar, setHasSidebar] = useState(() => localStorage.getItem('sidebar-closed') !== 'true');
	const servers = useSelector(({ servers }) => servers);
	const currentServerUrl = useSelector(({ currentServerUrl }) => currentServerUrl);
	const badges = useSelector(({ servers }) => servers.reduce((badges, { url, badge }) => ({ ...badges, [url]: badge }), {}));
	const [mainWindowState, setMainWindowState] = useState({});

	const globalBadge = useMemo(() => {
		const mentionCount = Object.values(badges)
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);
		return mentionCount || (Object.values(badges).some((badge) => !!badge) && '•') || null;
	}, [badges]);

	useSaga(function *() {
		yield takeEvery([MENU_BAR_QUIT_CLICKED, TRAY_ICON_QUIT_CLICKED], function *() {
			remote.app.quit();
		});

		yield takeEvery(MENU_BAR_OPEN_URL_CLICKED, function *({ payload: url }) {
			remote.shell.openExternal(url);
		});
	}, []);

	// eslint-disable-next-line complexity
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

		while (true) {
			const { type, payload } = yield take();

			if (type === MENU_BAR_RESET_APP_DATA_CLICKED) {
				const { response } = yield call(::remote.dialog.showMessageBox, {
					type: 'question',
					buttons: [t('dialog.resetAppData.yes'), t('dialog.resetAppData.cancel')],
					defaultId: 1,
					title: t('dialog.resetAppData.title'),
					message: t('dialog.resetAppData.message'),
				});

				if (response !== 0) {
					continue;
				}

				remote.app.relaunch({ args: [remote.process.argv[1], '--reset-app-data'] });
				remote.app.quit();
				continue;
			}

			if (type === MENU_BAR_TOGGLE_SETTING_CLICKED) {
				const property = payload;

				switch (property) {
					case 'showTrayIcon': {
						const previousValue = localStorage.getItem('hideTray') !== 'true';
						const newValue = !previousValue;
						localStorage.setItem('hideTray', JSON.stringify(!newValue));
						setHasTrayIcon(newValue);
						break;
					}

					case 'showWindowOnUnreadChanged': {
						const previousValue = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
						const newValue = !previousValue;
						localStorage.setItem('showWindowOnUnreadChanged', JSON.stringify(newValue));
						setShowWindowOnUnreadChanged(newValue);
						break;
					}

					case 'showMenuBar': {
						const previousValue = localStorage.getItem('autohideMenu') !== 'true';
						const newValue = !previousValue;
						localStorage.setItem('autohideMenu', JSON.stringify(!newValue));
						setHasMenuBar(newValue);
						break;
					}

					case 'showServerList': {
						const previousValue = localStorage.getItem('sidebar-closed') !== 'true';
						const newValue = !previousValue;
						localStorage.setItem('sidebar-closed', JSON.stringify(!newValue));
						setHasSidebar(newValue);
						break;
					}
				}
				continue;
			}

			if (type === MAIN_WINDOW_STATE_CHANGED) {
				setMainWindowState(payload);
				continue;
			}
		}
	}, []);

	const dispatch = useDispatch();

	useEffect(() => {
		window.dispatch = dispatch;
	}, [dispatch]);

	return <MainWindow
		badge={hasTrayIcon ? undefined : globalBadge}
		showWindowOnUnreadChanged={showWindowOnUnreadChanged}
	>
		<MenuBar
			showTrayIcon={hasTrayIcon}
			showFullScreen={mainWindowState.fullscreen}
			showWindowOnUnreadChanged={showWindowOnUnreadChanged}
			showMenuBar={hasMenuBar}
			showServerList={hasSidebar}
		/>
		<SideBar isVisible={servers.length > 0 && hasSidebar} />
		<ServersView
			servers={servers}
			currentServerUrl={currentServerUrl}
			hasSidebar={servers.length > 0 && hasSidebar}
		/>
		<AddServerView
			isVisible={currentServerUrl === null}
			isFull={!(servers.length > 0 && hasSidebar)}
		/>
		<AboutDialog />
		<ScreenSharingDialog />
		<SelectClientCertificateDialog />
		<UpdateDialog />
		<Dock badge={globalBadge} />
		<TrayIcon
			badge={globalBadge}
			show={!mainWindowState.visible || !mainWindowState.focused}
			visible={hasTrayIcon}
		/>
		<TouchBar />
	</MainWindow>;
}

class ErrorCatcher extends Component {
	componentDidCatch(error, errorInfo) {
		console.error(error);
		console.error(errorInfo);
		remote.dialog.showErrorBox(error.message, error.stack);
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
