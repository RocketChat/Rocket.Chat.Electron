import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';

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
		const payload = {
			url: getServerUrl(),
			style: {
				background,
				color,
			},
		};
		ipcRenderer.send('sidebar-style', payload);
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

	Tracker.autorun(async () => {
		const { url, defaultUrl } = settings.get('Assets_background') || {};
		const backgroundUrl = url || defaultUrl;
		referenceElement.style.backgroundImage = backgroundUrl
			? `url(${ JSON.stringify(Meteor.absoluteUrl(backgroundUrl)) })`
			: null;
		pollSidebarStyle(referenceElement);
	});

	const style = document.getElementById('sidebar-padding') || document.createElement('style');
	style.id = 'sidebar-padding';
	document.head.append(style);

	ipcRenderer.addListener('sidebar-visibility-changed', (_, hasSidebar) => {
		style.innerHTML = `
			.sidebar {
				padding-top: ${ hasSidebar ? '0' : '10px' } !important;
				transition: padding-top 230ms ease-in-out !important;
			}
		`;
	});
};
