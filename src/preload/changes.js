import url from 'url';

import { ipcRenderer, remote } from 'electron';

import { getMeteor, getTracker, getSettings } from './rocketChat';


function handleTitleChange() {
	const Meteor = getMeteor();
	const Tracker = getTracker();
	const settings = getSettings();

	if (!Meteor || !Tracker || !settings) {
		return;
	}

	Meteor.startup(() => {
		Tracker.autorun(() => {
			const siteName = settings.get('Site_Name');
			if (siteName) {
				ipcRenderer.sendToHost('title-changed', siteName);
			}
		});
	});
}

const fetchWithoutOrigin = remote.require('electron-fetch').default;

function handleFaviconChange() {
	const Meteor = getMeteor();
	const Tracker = getTracker();
	const settings = getSettings();

	if (!Meteor || !Tracker || !settings) {
		return;
	}

	Meteor.startup(() => {
		Tracker.autorun(async () => {
			settings.get('Assets_favicon');

			const faviconUrl = url.resolve(location.href, '/assets/favicon.svg');

			const response = await fetchWithoutOrigin(faviconUrl);
			const arrayBuffer = await response.arrayBuffer();
			const byteArray = Array.from(new Uint8Array(arrayBuffer));
			const binaryString = byteArray.reduce((binaryString, byte) => binaryString + String.fromCharCode(byte), '');
			const base64String = btoa(binaryString);

			ipcRenderer.sendToHost('favicon-changed', `data:image/svg+xml;base64,${ base64String }`);
		});
	});
}

const handleSidebarStyleChange = () => {
	const element = document.createElement('div');
	element.classList.add('sidebar');
	element.style.backgroundColor = 'var(--sidebar-background)';
	element.style.color = 'var(--sidebar-item-text-color)';
	element.style.display = 'none';
	document.body.append(element);

	let prevStyle = {};
	setInterval(() => {
		const { background, color } = window.getComputedStyle(element);

		if (prevStyle.background !== background || prevStyle.color !== color) {
			prevStyle = { background, color };
			ipcRenderer.sendToHost('sidebar-style', { color, background });
		}
	}, 1000);

	const Meteor = getMeteor();
	const Tracker = getTracker();
	const settings = getSettings();

	if (!Meteor || !Tracker || !settings) {
		return;
	}

	Meteor.startup(() => {
		Tracker.autorun(async () => {
			const { url } = settings.get('Assets_background');
			element.style.backgroundImage = url ? `url(${ JSON.stringify(url) })` : null;
		});
	});
};

export default () => {
	window.addEventListener('load', handleTitleChange);
	window.addEventListener('load', handleFaviconChange);
	window.addEventListener('load', handleSidebarStyleChange);
};
