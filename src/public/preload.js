/* globals Meteor, RocketChat, Tracker, UserPresence */

const { ipcRenderer, shell } = require('electron');
const path = require('path');
const url = require('url');
const Notification = require('./lib/Notification');
const SpellCheck = require('./lib/SpellCheck');
const i18n = require('../i18n/index');

window.Notification = Notification;
window.i18n = i18n;

window.open = ((defaultWindowOpen) => (href, frameName, features) => {
	if (url.parse(href).host === RocketChat.settings.get('Jitsi_Domain')) {
		features = [
			features,
			'nodeIntegration=true',
			`preload=${ path.join(__dirname, 'jitsi-preload.js') }`,
		].filter((x) => Boolean(x)).join(',');
	}

	return defaultWindowOpen(href, frameName, features);
})(window.open);

window.reloadServer = () => ipcRenderer.sendToHost('reload-server');

for (const eventName of ['unread-changed', 'get-sourceId', 'user-status-manually-set']) {
	window.addEventListener(eventName, (event) => ipcRenderer.sendToHost(eventName, event.detail));
}

const changeSidebarColor = () => {
	const sidebar = document.querySelector('.sidebar');
	if (sidebar) {
		const { color, background } = window.getComputedStyle(sidebar);
		const sidebarItem = sidebar.querySelector('.sidebar-item');
		const itemColor = sidebarItem && window.getComputedStyle(sidebarItem).color;
		ipcRenderer.sendToHost('sidebar-background', { color: itemColor || color, background });
		return;
	}

	const fullpage = document.querySelector('.full-page');
	if (fullpage) {
		const { color, background } = window.getComputedStyle(fullpage);
		ipcRenderer.sendToHost('sidebar-background', { color, background });
		return;
	}

	window.requestAnimationFrame(changeSidebarColor);
};

ipcRenderer.on('request-sidebar-color', changeSidebarColor);

window.addEventListener('load', () => {
	if (!Meteor) {
		return;
	}

	Meteor.startup(() => {
		Tracker.autorun(() => {
			const siteName = RocketChat.settings.get('Site_Name');
			if (siteName) {
				ipcRenderer.sendToHost('title-changed', siteName);
			}
		});
	});

	const INTERVAL = 10000; // 10s
	setInterval(() => {
		try {
			const idleTime = ipcRenderer.sendSync('getSystemIdleTime');
			if (idleTime < INTERVAL) {
				UserPresence.setOnline();
			}
		} catch (e) {
			console.error(`Error getting system idle time: ${ e }`);
		}
	}, INTERVAL);

	document.addEventListener('click', (event) => {
		const anchorElement = event.target.closest('a');

		if (!anchorElement) {
			return;
		}

		const { href } = anchorElement;

		// Check href matching current domain
		if (RegExp(`^${ location.protocol }\/\/${ location.host }`).test(href)) {
			return;
		}

		// Check if is file upload link
		if (/^\/file-upload\//.test(href) && !anchorElement.hasAttribute('download')) {
			const tempElement = document.createElement('a');
			tempElement.href = href;
			tempElement.download = 'download';
			tempElement.click();
			return;
		}

		// Check href matching relative URL
		if (!/^([a-z]+:)?\/\//.test(href)) {
			return;
		}

		if (/^file:\/\/.+/.test(href)) {
			const item = href.slice(6);
			shell.showItemInFolder(item);
			event.preventDefault();
			return;
		}

		shell.openExternal(href);
		event.preventDefault();
	}, true);
});

// Prevent redirect to url when dragging in
document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('drop', (event) => event.preventDefault());

const spellChecker = new SpellCheck();
spellChecker.enable();
