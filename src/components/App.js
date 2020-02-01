import { remote } from 'electron';
import i18n from 'i18next';
import React, { useEffect, useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Provider } from 'react-redux';

import { setupCertificates } from '../scripts/certificates';
import servers from '../scripts/servers';
import {
	setupUpdates,
	setAutoUpdate,
	checkForUpdates,
	skipUpdateVersion,
	downloadUpdate,
} from '../scripts/updates';
import { processDeepLink } from '../scripts/deepLinks';
import { setupSpellChecking } from '../scripts/spellChecking';
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
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_TOGGLE_SETTING_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	ADD_SERVER_VIEW_SERVER_ADDED,
	ABOUT_DIALOG_DISMISSED,
	UPDATE_DIALOG_DISMISSED,
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
	SCREEN_SHARING_DIALOG_DISMISSED,
	TRAY_ICON_QUIT_CLICKED,
	SIDE_BAR_SERVER_SELECTED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
	SIDE_BAR_SERVERS_SORTED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
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
} from '../scripts/actions';
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
import { dispatch, subscribe, store, sagaMiddleware } from '../storeAndEffects';
import { SagaMiddlewareProvider } from './SagaMiddlewareProvider';

export function App() {
	const { t } = useTranslation();

	const [loading, setLoading] = useState(true);
	const [showWindowOnUnreadChanged, setShowWindowOnUnreadChanged] =	useState(() => localStorage.getItem('showWindowOnUnreadChanged') === 'true');
	const [hasTrayIcon, setHasTrayIcon] =	useState(() => (localStorage.getItem('hideTray') ? localStorage.getItem('hideTray') !== 'true' : process.platform !== 'linux'));
	const [hasMenuBar, setHasMenuBar] = useState(() => localStorage.getItem('autohideMenu') !== 'true');
	const [hasSidebar, setHasSidebar] = useState(() => localStorage.getItem('sidebar-closed') !== 'true');
	const [_servers, setServers] = useState(() => {
		const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
		return Object.values(servers.hosts)
			.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b));
	});
	const [currentServerUrl, setCurrentServerUrl] = useState(() => servers.active);
	const [badges, setBadges] = useState({});
	const [styles, setStyles] = useState({});
	const [aboutDialogVisible, setAboutDialogVisible] = useState(false);
	const [newUpdateVersion, setNewUpdateVersion] = useState(null);
	const [updateDialogVisible, setUpdateDialogVisible] = useState(false);
	const [screenSharingDialogVisible, setScreenSharingDialogVisible] = useState(false);
	const [focusedWebContents, setFocusedWebContents] = useState(() => remote.getCurrentWebContents());
	const [mainWindowState, setMainWindowState] = useState({});
	const [canUpdate, setCanUpdate] = useState(false);
	const [canSetAutoUpdate, setCanSetAutoUpdate] = useState(false);
	const [canAutoUpdate, setCanAutoUpdate] = useState(false);

	useEffect(() => {
		// eslint-disable-next-line complexity
		const handleActionDispatched = async ({ type, payload = null }) => {
			if (type === MENU_BAR_QUIT_CLICKED) {
				remote.app.quit();
				return;
			}

			if (type === TRAY_ICON_QUIT_CLICKED) {
				remote.app.quit();
				return;
			}

			if (type === MENU_BAR_ABOUT_CLICKED) {
				setAboutDialogVisible(true);
				return;
			}

			if (type === MENU_BAR_OPEN_URL_CLICKED) {
				const url = payload;
				remote.shell.openExternal(url);
				return;
			}

			if (type === MENU_BAR_UNDO_CLICKED) {
				focusedWebContents.undo();
				return;
			}

			if (type === MENU_BAR_REDO_CLICKED) {
				focusedWebContents.redo();
				return;
			}

			if (type === MENU_BAR_CUT_CLICKED) {
				focusedWebContents.cut();
				return;
			}

			if (type === MENU_BAR_COPY_CLICKED) {
				focusedWebContents.copy();
				return;
			}

			if (type === MENU_BAR_PASTE_CLICKED) {
				focusedWebContents.paste();
				return;
			}

			if (type === MENU_BAR_SELECT_ALL_CLICKED) {
				focusedWebContents.selectAll();
				return;
			}

			if (type === MENU_BAR_ADD_NEW_SERVER_CLICKED) {
				servers.clearActive();
				setCurrentServerUrl(null);
				return;
			}

			if (type === MENU_BAR_RESET_ZOOM_CLICKED) {
				remote.getCurrentWebContents().zoomLevel = 0;
				return;
			}

			if (type === MENU_BAR_ZOOM_IN_CLICKED) {
				remote.getCurrentWebContents().zoomLevel++;
				return;
			}

			if (type === MENU_BAR_ZOOM_OUT_CLICKED) {
				remote.getCurrentWebContents().zoomLevel--;
				return;
			}

			if (type === MENU_BAR_RESET_APP_DATA_CLICKED) {
				const { response } = await remote.dialog.showMessageBox({
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
				return;
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
				return;
			}

			if (type === MENU_BAR_SELECT_SERVER_CLICKED) {
				const server = payload;
				servers.setActive(server.url);
				setCurrentServerUrl(server.url);
				return;
			}

			if (type === TOUCH_BAR_SELECT_SERVER_TOUCHED) {
				const serverUrl = payload;
				servers.setActive(serverUrl);
				setCurrentServerUrl(serverUrl);
				return;
			}

			if (type === ADD_SERVER_VIEW_SERVER_ADDED) {
				const url = servers.addHost(payload);
				if (url !== false) {
					servers.setActive(url);

					const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
					setServers(Object.values(servers.hosts)
						.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b)));
					setCurrentServerUrl(url);
				}
				return;
			}

			if (type === ABOUT_DIALOG_DISMISSED) {
				setAboutDialogVisible(false);
				return;
			}

			if (type === ABOUT_DIALOG_TOGGLE_UPDATE_ON_START) {
				const updateOnStart = payload;
				setAutoUpdate(updateOnStart);
				setCanAutoUpdate(updateOnStart);
				return;
			}

			if (type === ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED) {
				checkForUpdates(null, { forced: true });
				return;
			}

			if (type === UPDATE_DIALOG_DISMISSED) {
				setUpdateDialogVisible(false);
				return;
			}

			if (type === UPDATE_DIALOG_SKIP_UPDATE_CLICKED) {
				const skippedVersion = payload;
				skipUpdateVersion(skippedVersion);
				return;
			}

			if (type === UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED) {
				downloadUpdate();
				return;
			}

			if (type === SCREEN_SHARING_DIALOG_DISMISSED) {
				setScreenSharingDialogVisible(false);
				return;
			}

			if (type === SIDE_BAR_SERVER_SELECTED) {
				const hostUrl = payload;
				servers.setActive(hostUrl);
				setCurrentServerUrl(hostUrl);
				return;
			}

			if (type === SIDE_BAR_REMOVE_SERVER_CLICKED) {
				const hostUrl = payload;
				servers.removeHost(hostUrl);

				setCurrentServerUrl(null);
				const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
				setServers(Object.values(servers.hosts)
					.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b)));
				return;
			}

			if (type === SIDE_BAR_ADD_NEW_SERVER_CLICKED) {
				servers.clearActive();
				setCurrentServerUrl(null);
				return;
			}

			if (type === SIDE_BAR_SERVERS_SORTED) {
				const sorting = payload;
				localStorage.setItem('rocket.chat.sortOrder', JSON.stringify(sorting));
				setServers(Object.values(servers.hosts)
					.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b)));
				return;
			}

			if (type === WEBVIEW_UNREAD_CHANGED) {
				const { url, badge } = payload;

				setBadges((badges) => ({
					...badges,
					[url]: badge || null,
				}));
				return;
			}

			if (type === WEBVIEW_TITLE_CHANGED) {
				const { url, title } = payload;
				servers.setHostTitle(url, title || '');
				const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
				setServers(Object.values(servers.hosts)
					.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b)));
				return;
			}

			if (type === WEBVIEW_FOCUS_REQUESTED) {
				const { url } = payload;
				servers.setActive(url);
				setCurrentServerUrl(url);
				return;
			}

			if (type === WEBVIEW_SIDEBAR_STYLE_CHANGED) {
				const { url, style } = payload;
				setStyles((styles) => ({
					...styles,
					[url]: style || null,
				}));
				return;
			}

			if (type === WEBVIEW_DID_NAVIGATE) {
				const { url, pageUrl } = payload;
				if (pageUrl.includes(url)) {
					servers.hosts[url].lastPath = pageUrl;
					servers.save();
				}
				const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
				setServers(Object.values(servers.hosts)
					.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b)));
				return;
			}

			if (type === WEBVIEW_FOCUSED) {
				const { webContentsId } = payload;
				setFocusedWebContents(remote.webContents.fromId(webContentsId));
				return;
			}

			if (type === WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED) {
				setScreenSharingDialogVisible(true);
				return;
			}

			if (type === MAIN_WINDOW_STATE_CHANGED) {
				setMainWindowState(payload);
				return;
			}

			if (type === UPDATES_NEW_VERSION_AVAILABLE) {
				setNewUpdateVersion(payload);
				setUpdateDialogVisible(true);
				return;
			}

			if (type === DEEP_LINK_TRIGGERED) {
				const { url } = payload;
				if (servers.hostExists(url)) {
					servers.setActive(url);
					setCurrentServerUrl(url);
					return;
				}

				await servers.showHostConfirmation(url);
				setCurrentServerUrl(url);
				const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
				setServers(Object.values(servers.hosts)
					.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b)));
			}
		};

		return subscribe(handleActionDispatched);
	}, []);

	useEffect(() => {
		document.querySelector('.app-page').classList.toggle('app-page--loading', loading);
	}, [loading]);

	useEffect(() => {
		const handleConnectionStatus = () => {
			document.body.classList.toggle('offline', !navigator.onLine);
		};

		handleConnectionStatus();

		window.addEventListener('online', handleConnectionStatus);
		window.addEventListener('offline', handleConnectionStatus);

		return () => {
			window.removeEventListener('online', handleConnectionStatus);
			window.removeEventListener('offline', handleConnectionStatus);
		};
	}, []);

	useEffect(() => {
		servers.addListener('loaded', () => {
			setLoading(false);
			setCurrentServerUrl(servers.active);
			const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
			setServers(Object.values(servers.hosts)
				.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b)));
		});

		servers.addListener('host-added', () => {
			const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
			setServers(Object.values(servers.hosts)
				.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b)));
		});

		servers.addListener('host-removed', () => {
			servers.clearActive();
			setCurrentServerUrl(null);
		});

		servers.addListener('active-setted', (url) => {
			setCurrentServerUrl(url);
		});

		servers.addListener('active-cleared', () => {
			setCurrentServerUrl(null);
		});

		servers.addListener('title-setted', () => {
			const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
			setServers(Object.values(servers.hosts)
				.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b)));
		});
	}, []);

	useEffect(() => {
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

		return unsubscribe;
	}, []);

	useEffect(() => {
		setupCertificates();
		setupSpellChecking();
		const { canUpdate, canSetAutoUpdate, canAutoUpdate } = setupUpdates();

		setCanUpdate(canUpdate);
		setCanSetAutoUpdate(canSetAutoUpdate);
		setCanAutoUpdate(canAutoUpdate);

		servers.initialize();
		servers.setActive(servers.active);

		remote.process.argv.slice(2).forEach(processDeepLink);

		window.dispatch = dispatch;
	}, []);

	const mentionCount = Object.values(badges)
		.filter((badge) => Number.isInteger(badge))
		.reduce((sum, count) => sum + count, 0);
	const globalBadge = mentionCount
		|| (Object.values(badges).some((badge) => !!badge) && '•')
		|| null;

	return <Provider store={store}>
		<SagaMiddlewareProvider sagaMiddleware={sagaMiddleware}>
			<I18nextProvider i18n={i18n}>
				<MainWindow
					showWindowOnUnreadChanged={showWindowOnUnreadChanged}
					dispatch={dispatch}
					subscribe={subscribe}
				>
					<MenuBar
						showTrayIcon={hasTrayIcon}
						showFullScreen={mainWindowState.fullscreen}
						showWindowOnUnreadChanged={showWindowOnUnreadChanged}
						showMenuBar={hasMenuBar}
						showServerList={hasSidebar}
						servers={_servers}
						currentServerUrl={currentServerUrl}
						dispatch={dispatch}
					/>
					<SideBar
						servers={_servers}
						currentServerUrl={currentServerUrl}
						badges={badges}
						visible={hasSidebar}
						styles={styles}
						dispatch={dispatch}
						subscribe={subscribe}
					/>
					<ServersView
						servers={_servers}
						currentServerUrl={currentServerUrl}
						hasSidebar={hasSidebar}
						dispatch={dispatch}
						subscribe={subscribe}
					/>
					<AddServerView
						visible={currentServerUrl === null}
						dispatch={dispatch}
						subscribe={subscribe}
					/>
					<AboutDialog
						canUpdate={canUpdate}
						canSetAutoUpdate={canSetAutoUpdate}
						canAutoUpdate={canAutoUpdate}
						visible={aboutDialogVisible}
						dispatch={dispatch}
						subscribe={subscribe}
					/>
					<UpdateDialog
						newVersion={newUpdateVersion}
						visible={updateDialogVisible}
						dispatch={dispatch}
					/>
					<ScreenSharingDialog
						visible={screenSharingDialogVisible}
						dispatch={dispatch}
					/>
					<Dock
						badge={globalBadge}
						hasTrayIcon={hasTrayIcon}
					/>
					<TrayIcon
						badge={globalBadge}
						isMainWindowVisible={mainWindowState.visible && mainWindowState.focused}
						showIcon={hasTrayIcon}
						dispatch={dispatch}
					/>
					<TouchBar
						servers={_servers}
						activeServerUrl={currentServerUrl}
						dispatch={dispatch}
					/>
				</MainWindow>
			</I18nextProvider>
		</SagaMiddlewareProvider>
	</Provider>;
}
