import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';

export const setupFaviconChanges = () => {
	const { Meteor } = window.require('meteor/meteor');
	const { Tracker } = window.require('meteor/tracker');
	const { settings } = window.require('/app/settings');

	const canvas = document.createElement('canvas');
	canvas.width = 100;
	canvas.height = 100;
	const ctx = canvas.getContext('2d');

	const image = new Image();

	image.onload = () => {
		ctx.clearRect(0, 0, 100, 100);
		ctx.drawImage(image, 0, 0, 100, 100);
		const payload = {
			url: getServerUrl(),
			favicon: canvas.toDataURL(),
		};
		ipcRenderer.send('favicon-changed', payload);
	};

	Tracker.autorun(async () => {
		const { url, defaultUrl } = settings.get('Assets_favicon') || {};
		const faviconUrl = url || defaultUrl;

		if (typeof faviconUrl !== 'string') {
			return;
		}

		image.src = Meteor.absoluteUrl(faviconUrl);
	});
};
