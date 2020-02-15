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
		if (!siteName) {
			return;
		}
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
		const faviconUrl = (url || defaultUrl) && Meteor.absoluteUrl(url || defaultUrl);

		if (faviconUrl) {
			const canvas = document.createElement('canvas');
			canvas.width = 100;
			canvas.height = 100;
			const ctx = canvas.getContext('2d');

			const image = new Image();
			image.src = faviconUrl;
			image.onload = () => {
				ctx.drawImage(image, 0, 0, 100, 100);
				ipcRenderer.sendToHost('favicon-changed', canvas.toDataURL());
			};
		} else {
			ipcRenderer.sendToHost('favicon-changed', null);
		}
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

	window.addEventListener('unread-changed', (event) => {
		ipcRenderer.sendToHost('unread-changed', event.detail);
	});

	window.addEventListener('get-sourceId', (event) => {
		ipcRenderer.sendToHost('get-sourceId', event.detail);
	});

	let focusedMessageBoxInput = null;

	document.addEventListener('focus', (event) => {
		if (event.target.classList.contains('js-input-message')) {
			focusedMessageBoxInput = event.target;
			ipcRenderer.sendToHost('message-box-focused');
		}
	}, true);

	document.addEventListener('blur', (event) => {
		if (event.target.classList.contains('js-input-message')) {
			focusedMessageBoxInput = null;
			ipcRenderer.sendToHost('message-box-blurred');
		}
	}, true);

	document.addEventListener('focus', () => {
		ipcRenderer.sendToHost('edit-flags-changed', {
			canUndo: document.queryCommandEnabled('undo'),
			canRedo: document.queryCommandEnabled('redo'),
			canCut: document.queryCommandEnabled('cut'),
			canCopy: document.queryCommandEnabled('copy'),
			canPaste: document.queryCommandEnabled('paste'),
			canSelectAll: document.queryCommandEnabled('selectAll'),
		});
	}, true);

	document.addEventListener('selectionchange', () => {
		ipcRenderer.sendToHost('edit-flags-changed', {
			canUndo: document.queryCommandEnabled('undo'),
			canRedo: document.queryCommandEnabled('redo'),
			canCut: document.queryCommandEnabled('cut'),
			canCopy: document.queryCommandEnabled('copy'),
			canPaste: document.queryCommandEnabled('paste'),
			canSelectAll: document.queryCommandEnabled('selectAll'),
		});
	}, true);

	ipcRenderer.addListener('format-button-touched', (_, buttonId) => {
		if (!focusedMessageBoxInput) {
			return;
		}

		const { formattingButtons, applyFormatting } = window.require('/app/ui-message/client/messageBox/messageBoxFormatting');
		const { pattern } = formattingButtons
			.filter(({ condition }) => !condition || condition())
			.find(({ label }) => label === buttonId) || {};

		applyFormatting(pattern, focusedMessageBoxInput);
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
