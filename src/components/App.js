import querystring from 'querystring';
import url from 'url';

import { remote } from 'electron';
import i18n from 'i18next';
import React, { useEffect, useState, useMemo } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { call, put, take } from 'redux-saga/effects';

import servers from '../scripts/servers';
import {
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_OPEN_URL_CLICKED,
	MENU_BAR_UNDO_CLICKED,
	MENU_BAR_REDO_CLICKED,
	MENU_BAR_CUT_CLICKED,
	MENU_BAR_COPY_CLICKED,
	MENU_BAR_PASTE_CLICKED,
	MENU_BAR_SELECT_ALL_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_TOGGLE_SETTING_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	ADD_SERVER_VIEW_SERVER_ADDED,
	ABOUT_DIALOG_DISMISSED,
	UPDATE_DIALOG_DISMISSED,
	SCREEN_SHARING_DIALOG_DISMISSED,
	TRAY_ICON_QUIT_CLICKED,
	SIDE_BAR_SERVER_SELECTED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
	SIDE_BAR_SERVERS_SORTED,
	WEBVIEW_UNREAD_CHANGED,
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	WEBVIEW_DID_NAVIGATE,
	WEBVIEW_FOCUSED,
	WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
	MAIN_WINDOW_STATE_CHANGED,
	UPDATES_NEW_VERSION_AVAILABLE,
	DEEP_LINK_TRIGGERED,
	SERVERS_UPDATED,
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
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
import { store, sagaMiddleware } from '../storeAndEffects';
import { SagaMiddlewareProvider, useSaga } from './SagaMiddlewareProvider';
import { SpellCheckingProvider } from './SpellCheckingProvider';
import { UpdatesProvider } from './UpdatesProvider';
import { CertificatesProvider } from './CertificatesProvider';
import { ServersProvider } from './ServersProvider';

function AppContent() {
	const { t } = useTranslation();

	const [loading, setLoading] = useState(true);
	const [showWindowOnUnreadChanged, setShowWindowOnUnreadChanged] =	useState(() => localStorage.getItem('showWindowOnUnreadChanged') === 'true');
	const [hasTrayIcon, setHasTrayIcon] =	useState(() => (localStorage.getItem('hideTray') ? localStorage.getItem('hideTray') !== 'true' : process.platform !== 'linux'));
	const [hasMenuBar, setHasMenuBar] = useState(() => localStorage.getItem('autohideMenu') !== 'true');
	const [hasSidebar, setHasSidebar] = useState(() => localStorage.getItem('sidebar-closed') !== 'true');
	const _servers = useSelector(({ servers }) => servers);
	const currentServerUrl = useSelector(({ currentServerUrl }) => currentServerUrl);
	const [badges, setBadges] = useState({});
	const [styles, setStyles] = useState({});
	const [newUpdateVersion, setNewUpdateVersion] = useState(null);
	const [focusedWebContents, setFocusedWebContents] = useState(() => remote.getCurrentWebContents());
	const [mainWindowState, setMainWindowState] = useState({});
	const [openDialog, setOpenDialog] = useState(null);
	const [offline, setOffline] = useState(false);

	const globalBadge = useMemo(() => {
		const mentionCount = Object.values(badges)
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);
		return mentionCount || (Object.values(badges).some((badge) => !!badge) && '•') || null;
	}, [badges]);

	// eslint-disable-next-line complexity
	useSaga(function *() {
		while (true) {
			const { type, payload } = yield take();

			if (type === MENU_BAR_QUIT_CLICKED) {
				remote.app.quit();
				continue;
			}

			if (type === TRAY_ICON_QUIT_CLICKED) {
				remote.app.quit();
				continue;
			}

			if (type === MENU_BAR_ABOUT_CLICKED) {
				setOpenDialog('about');
				continue;
			}

			if (type === MENU_BAR_OPEN_URL_CLICKED) {
				const url = payload;
				remote.shell.openExternal(url);
				continue;
			}

			if (type === MENU_BAR_UNDO_CLICKED) {
				focusedWebContents.undo();
				continue;
			}

			if (type === MENU_BAR_REDO_CLICKED) {
				focusedWebContents.redo();
				continue;
			}

			if (type === MENU_BAR_CUT_CLICKED) {
				focusedWebContents.cut();
				continue;
			}

			if (type === MENU_BAR_COPY_CLICKED) {
				focusedWebContents.copy();
				continue;
			}

			if (type === MENU_BAR_PASTE_CLICKED) {
				focusedWebContents.paste();
				continue;
			}

			if (type === MENU_BAR_SELECT_ALL_CLICKED) {
				focusedWebContents.selectAll();
				continue;
			}

			if (type === MENU_BAR_ADD_NEW_SERVER_CLICKED) {
				servers.clearActive();
				continue;
			}

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

			if (type === MENU_BAR_SELECT_SERVER_CLICKED) {
				const server = payload;
				servers.setActive(server.url);
				continue;
			}

			if (type === TOUCH_BAR_SELECT_SERVER_TOUCHED) {
				const serverUrl = payload;
				servers.setActive(serverUrl);
				continue;
			}

			if (type === ADD_SERVER_VIEW_SERVER_ADDED) {
				servers.put({ url: payload, title: payload });
				servers.setActive(payload);

				yield put({
					type: SERVERS_UPDATED,
					payload: {
						servers: servers.all(),
						currentServerUrl: servers.active,
					},
				});
				continue;
			}

			if (type === ABOUT_DIALOG_DISMISSED) {
				setOpenDialog(null);
				continue;
			}

			if (type === UPDATE_DIALOG_DISMISSED) {
				setOpenDialog(null);
				continue;
			}

			if (type === SCREEN_SHARING_DIALOG_DISMISSED) {
				setOpenDialog(null);
				continue;
			}

			if (type === SIDE_BAR_SERVER_SELECTED) {
				const hostUrl = payload;
				servers.setActive(hostUrl);
				continue;
			}

			if (type === SIDE_BAR_REMOVE_SERVER_CLICKED) {
				const url = payload;
				servers.remove(url);

				yield put({
					type: SERVERS_UPDATED,
					payload: {
						servers: servers.all(),
						currentServerUrl: servers.active,
					},
				});
				continue;
			}

			if (type === SIDE_BAR_ADD_NEW_SERVER_CLICKED) {
				servers.clearActive();
				continue;
			}

			if (type === SIDE_BAR_SERVERS_SORTED) {
				servers.sort(payload);
				yield put({
					type: SERVERS_UPDATED,
					payload: {
						servers: servers.all(),
						currentServerUrl: servers.active,
					},
				});
				continue;
			}

			if (type === SCREEN_SHARING_DIALOG_SOURCE_SELECTED) {
				setOpenDialog(null);
				continue;
			}

			if (type === WEBVIEW_UNREAD_CHANGED) {
				const { url, badge } = payload;

				setBadges((badges) => ({
					...badges,
					[url]: badge || null,
				}));
				continue;
			}

			if (type === WEBVIEW_TITLE_CHANGED) {
				const { url, title } = payload;
				servers.put({ url, title: title || url });
				yield put({
					type: SERVERS_UPDATED,
					payload: {
						servers: servers.all(),
						currentServerUrl: servers.active,
					},
				});
				continue;
			}

			if (type === WEBVIEW_FOCUS_REQUESTED) {
				const { url } = payload;
				servers.setActive(url);
				continue;
			}

			if (type === WEBVIEW_SIDEBAR_STYLE_CHANGED) {
				const { url, style } = payload;
				setStyles((styles) => ({
					...styles,
					[url]: style || null,
				}));
				continue;
			}

			if (type === WEBVIEW_DID_NAVIGATE) {
				const { url, pageUrl } = payload;
				if (pageUrl.includes(url)) {
					servers.put({ url, lastPath: pageUrl });
					yield put({
						type: SERVERS_UPDATED,
						payload: {
							servers: servers.all(),
							currentServerUrl: servers.active,
						},
					});
				}
				continue;
			}

			if (type === WEBVIEW_FOCUSED) {
				const { webContentsId } = payload;
				setFocusedWebContents(remote.webContents.fromId(webContentsId));
				continue;
			}

			if (type === WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED) {
				setOpenDialog('screen-sharing');
				continue;
			}

			if (type === MAIN_WINDOW_STATE_CHANGED) {
				setMainWindowState(payload);
				continue;
			}

			if (type === UPDATES_NEW_VERSION_AVAILABLE) {
				setNewUpdateVersion(payload);
				setOpenDialog('update');
				continue;
			}

			if (type === DEEP_LINK_TRIGGERED) {
				const { url } = payload;
				if (servers.has(url)) {
					servers.setActive(url);
					continue;
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
						yield call(::servers.validateHost(url));
						servers.put({ url, title: url });
						servers.setActive(url);
					} catch (error) {
						remote.dialog.showErrorBox(t('dialog.addServerError.title'), t('dialog.addServerError.message', { host: url }));
					}
				}


				yield put({
					type: SERVERS_UPDATED,
					payload: {
						servers: servers.all(),
						currentServerUrl: servers.active,
					},
				});
			}
		}
	}, [focusedWebContents]);

	useEffect(() => {
		const handleConnectionStatus = () => {
			setOffline(!navigator.onLine);
		};

		handleConnectionStatus();

		window.addEventListener('online', handleConnectionStatus);
		window.addEventListener('offline', handleConnectionStatus);

		return () => {
			window.removeEventListener('online', handleConnectionStatus);
			window.removeEventListener('offline', handleConnectionStatus);
		};
	}, []);

	const dispatch = useDispatch();

	useEffect(() => {
		setLoading(false);

		servers.addListener('active-setted', () => {
			dispatch({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.active,
				},
			});
		});

		servers.addListener('active-cleared', () => {
			dispatch({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.active,
				},
			});
		});
	}, []);

	useEffect(() => {
		const normalizeUrl = (hostUrl, insecure = false) => {
			if (!/^https?:\/\//.test(hostUrl)) {
				return `${ insecure ? 'http' : 'https' }://${ hostUrl }`;
			}

			return hostUrl;
		};

		const processAuth = ({ host, token, userId, insecure }) => {
			const hostUrl = normalizeUrl(host, insecure === 'true');
			dispatch({ type: DEEP_LINK_TRIGGERED, payload: { type: 'auth', url: hostUrl, token, userId } });
		};

		const processRoom = ({ host, rid, path, insecure }) => {
			const hostUrl = normalizeUrl(host, insecure === 'true');
			dispatch({ type: DEEP_LINK_TRIGGERED, payload: { type: 'room', url: hostUrl, rid, path } });
		};

		const processDeepLink = (link) => {
			const { protocol, hostname:	action, query } = url.parse(link);

			if (protocol !== 'rocketchat:') {
				return;
			}

			switch (action) {
				case 'auth': {
					processAuth(querystring.parse(query));
					break;
				}
				case 'room': {
					processRoom(querystring.parse(query));
					break;
				}
			}
		};

		const handleLogin = (event, webContents, request, authInfo, callback) => {
			for (const url of Object.keys(servers.hosts)) {
				const server = servers.hosts[url];
				if (request.url.indexOf(url) === 0 && server.username) {
					callback(server.username, server.password);
					break;
				}
			}
		};

		const handleOpenUrl = (event, url) => {
			processDeepLink(url);
		};

		const handleSecondInstance = (event, argv) => {
			argv.slice(2).forEach(processDeepLink);
		};

		remote.app.addListener('login', handleLogin);
		remote.app.addListener('open-url', handleOpenUrl);
		remote.app.addListener('second-instance', handleSecondInstance);

		const unsubscribe = () => {
			remote.app.removeListener('login', handleLogin);
			remote.app.removeListener('open-url', handleOpenUrl);
			remote.app.removeListener('second-instance', handleSecondInstance);
		};

		window.addEventListener('beforeunload', unsubscribe);

		remote.process.argv.slice(2).forEach(processDeepLink);

		return unsubscribe;
	}, []);

	useEffect(() => {
		window.dispatch = dispatch;
	}, []);

	return <MainWindow
		badge={hasTrayIcon ? undefined : globalBadge}
		loading={loading}
		offline={offline}
		showWindowOnUnreadChanged={showWindowOnUnreadChanged}
	>
		<MenuBar
			showTrayIcon={hasTrayIcon}
			showFullScreen={mainWindowState.fullscreen}
			showWindowOnUnreadChanged={showWindowOnUnreadChanged}
			showMenuBar={hasMenuBar}
			showServerList={hasSidebar}
			servers={_servers}
			currentServerUrl={currentServerUrl}
		/>
		<SideBar
			servers={_servers}
			currentServerUrl={currentServerUrl}
			badges={badges}
			visible={hasSidebar}
			styles={styles}
		/>
		<ServersView
			servers={_servers}
			currentServerUrl={currentServerUrl}
			hasSidebar={hasSidebar}
		/>
		<AddServerView
			validator={(url) => servers.validateHost(url)}
			visible={currentServerUrl === null}
		/>
		<AboutDialog
			visible={openDialog === 'about'}
		/>
		<UpdateDialog
			newVersion={newUpdateVersion}
			visible={openDialog === 'update'}
		/>
		<ScreenSharingDialog
			visible={openDialog === 'screen-sharing'}
		/>
		<Dock
			badge={globalBadge}
		/>
		<TrayIcon
			badge={globalBadge}
			show={!mainWindowState.visible || !mainWindowState.focused}
			visible={hasTrayIcon}
		/>
		<TouchBar
			servers={_servers}
			currentServerUrl={currentServerUrl}
		/>
	</MainWindow>;
}

export function App() {
	return <Provider store={store}>
		<SagaMiddlewareProvider sagaMiddleware={sagaMiddleware}>
			<I18nextProvider i18n={i18n}>
				<CertificatesProvider>
					<ServersProvider>
						<SpellCheckingProvider>
							<UpdatesProvider>
								<AppContent />
							</UpdatesProvider>
						</SpellCheckingProvider>
					</ServersProvider>
				</CertificatesProvider>
			</I18nextProvider>
		</SagaMiddlewareProvider>
	</Provider>;
}
