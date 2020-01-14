import { remote } from 'electron';
import { t } from 'i18next';
import { createElement, useEffect, useRef } from './reactiveUi';

function MenuItem(props) {
	return null;
}

function Menu({ children, ref, ...props }) {
	const menuRef = useRef();

	useEffect(() => {
		const mapChildren = (children) => children.map(({ props: { children, ...props } }) => ({
			...props,
			submenu: children ? mapChildren(children) : null,
		}));

		const template = mapChildren(children);
		const menu = remote.Menu.buildFromTemplate(template);
		ref.current = menu;

		return () => {
			ref.current = null;
		};
	}, [ref, children]);

	return null;
}

function MenuBar({
	showFullScreen,
	showServerList,
	showTrayIcon,
	showMenuBar,
	servers = [],
	currentServerUrl,
	showWindowOnUnreadChanged,
	onAction,
}) {
	const menuRef = useRef();

	useEffect(() => {
		remote.Menu.setApplicationMenu(menuRef.current);

		return () => {
			remote.Menu.setApplicationMenu(null);
		};
	});

	useEffect(() => {
		if (process.platform === 'darwin') {
			return;
		}

		remote.getCurrentWindow().autoHideMenuBar = !showMenuBar;
		remote.getCurrentWindow().setMenuBarVisibility(!!showMenuBar);
	}, [showMenuBar]);

	const appName = remote.app.name;

	return createElement(Menu, { ref: menuRef, children: [
		createElement(MenuItem, { label: process.platform === 'darwin' ? appName : t('menus.fileMenu'), children: [
			...process.platform === 'darwin' ? [
				createElement(MenuItem, {
					label: t('menus.about', { appName }),
					click: () => onAction({ type: 'about' })
				}),
				createElement(MenuItem, { type: 'separator' }),
				createElement(MenuItem, { role: 'services' }),
				createElement(MenuItem, { type: 'separator' }),
				createElement(MenuItem, { accelerator: 'Command+H', role: 'hide' }),
				createElement(MenuItem, { accelerator: 'Command+Alt+H', role: 'hideothers' }),
				createElement(MenuItem, { role: 'unhide' }),
				createElement(MenuItem, { type: 'separator' }),
			] : [],
			...process.platform !== 'darwin' ? [
				createElement(MenuItem, {
					label: t('menus.addNewServer'),
					accelerator: 'CommandOrControl+N',
					click: () => onAction({ type: 'add-new-server' })
				}),
			] : [],
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.quit', { appName }),
				accelerator: 'CommandOrControl+Q',
				click: () => onAction({ type: 'quit' })
			}),
		] }),
		createElement(MenuItem, { label: t('menus.editMenu'), children: [
			createElement(MenuItem, {
				label: t('menus.undo'),
				accelerator: 'CommandOrControl+Z',
				click: () => onAction({ type: 'undo' }),
			}),
			createElement(MenuItem, {
				label: t('menus.redo'),
				accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				click: () => onAction({ type: 'redo' }),
			}),
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.cut'),
				accelerator: 'CommandOrControl+X',
				click: () => onAction({ type: 'cut' }),
			}),
			createElement(MenuItem, {
				label: t('menus.copy'),
				accelerator: 'CommandOrControl+C',
				click: () => onAction({ type: 'copy' }),
			}),
			createElement(MenuItem, {
				label: t('menus.paste'),
				accelerator: 'CommandOrControl+V',
				click: () => onAction({ type: 'paste' }),
			}),
			createElement(MenuItem, {
				label: t('menus.selectAll'),
				accelerator: 'CommandOrControl+A',
				click: () => onAction({ type: 'select-all' }),
			}),
		] }),
		createElement(MenuItem, { label: t('menus.viewMenu'), children: [
			createElement(MenuItem, {
				label: t('menus.reload'),
				accelerator: 'CommandOrControl+R',
				click: () => onAction({ type: 'reload-server' }),
			}),
			createElement(MenuItem, {
				label: t('menus.reloadIgnoringCache'),
				click: () => onAction({ type: 'reload-server', payload: { ignoringCache: true } }),
			}),
			createElement(MenuItem, {
				label: t('menus.clearTrustedCertificates'),
				click: () => onAction({ type: 'reload-server', payload: { ignoringCache: true, clearCertificates: true } }),
			}),
			createElement(MenuItem, {
				label: t('menus.openDevTools'),
				accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
				click: () => onAction({ type: 'open-devtools-for-server' }),
			}),
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.back'),
				accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
				click: () => onAction({ type: 'go-back' }),
			}),
			createElement(MenuItem, {
				label: t('menus.forward'),
				accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
				click: () => onAction({ type: 'go-forward' }),
			}),
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.showTrayIcon'),
				type: 'checkbox',
				checked: showTrayIcon,
				click: () => onAction({ type: 'toggle', payload: 'showTrayIcon' }),
			}),
			...process.platform === 'darwin' ? [
				createElement(MenuItem, {
					label: t('menus.showFullScreen'),
					type: 'checkbox',
					checked: showFullScreen,
					accelerator: 'Control+Command+F',
					click: () => onAction({ type: 'toggle', payload: 'showFullScreen' }),
				}),
			] : [
				createElement(MenuItem, {
					label: t('menus.showMenuBar'),
					type: 'checkbox',
					checked: showMenuBar,
					click: () => onAction({ type: 'toggle', payload: 'showMenuBar' }),
				}),
			],
			createElement(MenuItem, {
				label: t('menus.showServerList'),
				type: 'checkbox',
				checked: showServerList,
				click: () => onAction({ type: 'toggle', payload: 'showServerList' }),
			}),
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.resetZoom'),
				accelerator: 'CommandOrControl+0',
				click: () => onAction({ type: 'reset-zoom' }),
			}),
			createElement(MenuItem, {
				label: t('menus.zoomIn'),
				accelerator: 'CommandOrControl+Plus',
				click: () => onAction({ type: 'zoom-in' }),
			}),
			createElement(MenuItem, {
				label: t('menus.zoomOut'),
				accelerator: 'CommandOrControl+-',
				click: () => onAction({ type: 'zoom-out' }),
			}),
		] }),
		createElement(MenuItem, { label: t('menus.windowMenu'), role: 'window', children: [
			...process.platform === 'darwin' ? [
				createElement(MenuItem, {
					label: t('menus.addNewServer'),
					accelerator: 'CommandOrControl+N',
					click: () => onAction({ type: 'add-new-server' }),
				}),
				createElement(MenuItem, { type: 'separator' }),
			] : [],
			...servers.map((host, i) => createElement(MenuItem, {
				label: host.title.replace(/&/g, '&&'),
				type: currentServerUrl ? 'radio' : 'normal',
				checked: currentServerUrl === host.url,
				accelerator: `CommandOrControl+${ i + 1 }`,
				id: host.url,
				click: () => onAction({ type: 'select-server', payload: host }),
			})),
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.reload'),
				accelerator: 'CommandOrControl+Shift+R',
				click: () => onAction({ type: 'reload-app' }),
			}),
			createElement(MenuItem, {
				label: t('menus.toggleDevTools'),
				click: () => onAction({ type: 'toggle-devtools' }),
			}),
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.showOnUnreadMessage'),
				type: 'checkbox',
				checked: showWindowOnUnreadChanged,
				click: () => onAction({ type: 'toggle', payload: 'showWindowOnUnreadChanged' }),
			}),
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.minimize'),
				accelerator: 'CommandOrControl+M',
				role: 'minimize',
			}),
			createElement(MenuItem, {
				label: t('menus.close'),
				accelerator: 'CommandOrControl+W',
				role: 'close',
			}),
		] }),
		createElement(MenuItem, { label: t('menus.helpMenu'), role: 'help', children: [
			createElement(MenuItem, {
				label: t('menus.documentation'),
				click: () => onAction({ type: 'open-url', payload: 'https://rocket.chat/docs' }),
			}),
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.reportIssue'),
				click: () => onAction({ type: 'open-url', payload: 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new' }),
			}),
			createElement(MenuItem, {
				label: t('menus.resetAppData'),
				click: () => onAction({ type: 'reset-app-data' }),
			}),
			createElement(MenuItem, { type: 'separator' }),
			createElement(MenuItem, {
				label: t('menus.learnMore'),
				click: () => onAction({ type: 'open-url', payload: 'https://rocket.chat' }),
			}),
			...process.platform !== 'darwin' ? [
				createElement(MenuItem, {
					label: t('menus.about', { appName }),
					click: () => onAction({ type: 'about' }),
				}),
			] : [],
		] }),
	] });
}

let menuBarElement;

export const mountMenuBar = (props) => {
	menuBarElement = createElement(MenuBar, props);
	menuBarElement.mount(document.body);
};

export const updateMenuBar = (newProps) => {
	menuBarElement.update(newProps);
};
