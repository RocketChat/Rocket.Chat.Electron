import { ipcRenderer } from 'electron';
import { t } from 'i18next';

import { getMeteor, getTracker, getSettings } from './rocketChat';


function handleTitleChange() {
	const Tracker = getTracker();
	const settings = getSettings();

	if (!Tracker || !settings) {
		return;
	}

	Tracker.autorun(() => {
		const siteName = settings.get('Site_Name');
		ipcRenderer.sendToHost('title-changed', siteName);
	});
}

function handleFaviconChange() {
	const Meteor = getMeteor();
	const Tracker = getTracker();
	const settings = getSettings();

	if (!Meteor || !Tracker || !settings) {
		return;
	}

	Tracker.autorun(async () => {
		const { url, defaultUrl } = settings.get('Assets_favicon') || {};
		ipcRenderer.sendToHost('favicon-changed', Meteor.absoluteUrl(url || defaultUrl));
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

	Tracker.autorun(async () => {
		const { url, defaultUrl } = settings.get('Assets_background') || {};

		if (url || defaultUrl) {
			element.style.backgroundImage = `url(${ JSON.stringify(Meteor.absoluteUrl(url || defaultUrl)) })`;
		} else {
			element.style.backgroundImage = null;
		}
	});
};

export default () => {
	window.addEventListener('load', handleTitleChange);
	window.addEventListener('load', handleFaviconChange);
	window.addEventListener('load', handleSidebarStyleChange);

	ipcRenderer.addListener('format-button-touched', (_, buttonId) => {
		const button = document.querySelector(`.rc-message-box .js-format[data-id='${ buttonId }']`);
		button.click();
	});

	ipcRenderer.addListener('screen-sharing-source-selected', (_, source) => {
		window.parent.postMessage({ sourceId: source || 'PermissionDeniedError' }, '*');
	});

	ipcRenderer.addListener('sidebar-visibility-changed', (_, hasSidebar) => {
		const style = document.getElementById('sidebar-padding') || document.createElement('style');
		style.id = 'sidebar-padding';
		style.innerHTML = `
			.sidebar {
				padding-top: ${ hasSidebar ? '0' : '10px' } !important;
				transition: padding-top 230ms ease-in-out !important;
			}
		`;
		document.head.append(style);
	});

	console.warn('%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
	console.warn('%c%s', 'font-size: 20px;', t('selfxss.description'));
	console.warn('%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));
};
