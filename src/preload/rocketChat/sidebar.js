import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';
import {
	EVENT_SERVER_SIDEBAR_STYLE_CHANGED,
	EVENT_SIDEBAR_VISIBLE,
	EVENT_SIDEBAR_HIDDEN,
} from '../../ipc';

let timer;
let prevBackground;
let prevColor;

const pollSidebarStyle = (referenceElement) => {
	clearTimeout(timer);

	document.body.append(referenceElement);
	const {
		background,
		color,
	} = window.getComputedStyle(referenceElement);
	referenceElement.remove();

	if (prevBackground !== background || prevColor !== color) {
		ipcRenderer.send(EVENT_SERVER_SIDEBAR_STYLE_CHANGED, {
			url: getServerUrl(),
			style: {
				background,
				color,
			},
		});
		prevBackground = background;
		prevColor = color;
	}

	timer = setTimeout(() => pollSidebarStyle(referenceElement), 1000);
};

export const setupSidebarChanges = () => {
	const referenceElement = document.createElement('div');
	referenceElement.classList.add('sidebar');
	referenceElement.style.backgroundColor = 'var(--sidebar-background)';
	referenceElement.style.color = 'var(--sidebar-item-text-color)';
	referenceElement.style.display = 'none';

	const { Meteor } = window.require('meteor/meteor');
	const { Tracker } = window.require('meteor/tracker');
	const { settings } = window.require('/app/settings');

	Tracker.autorun(() => {
		const { url, defaultUrl } = settings.get('Assets_background') || {};
		const backgroundUrl = url || defaultUrl;

		if (backgroundUrl) {
			referenceElement.style.backgroundImage = `url(${ JSON.stringify(Meteor.absoluteUrl(backgroundUrl)) })`;
		} else {
			referenceElement.style.backgroundImage = null;
		}

		pollSidebarStyle(referenceElement);
	});

	const style = document.getElementById('sidebar-padding') || document.createElement('style');
	style.id = 'sidebar-padding';
	document.head.append(style);

	ipcRenderer.addListener(EVENT_SIDEBAR_VISIBLE, () => {
		style.innerHTML = `
			.sidebar {
				padding-top: 0 !important;
				transition: padding-top 230ms ease-in-out !important;
			}
		`;
	});

	ipcRenderer.addListener(EVENT_SIDEBAR_HIDDEN, () => {
		style.innerHTML = `
			.sidebar {
				padding-top: 10px !important;
				transition: padding-top 230ms ease-in-out !important;
			}
		`;
	});
};
