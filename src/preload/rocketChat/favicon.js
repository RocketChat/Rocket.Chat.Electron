import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';
import { EVENT_SERVER_FAVICON_CHANGED } from '../../ipc';

const FAVICON_SIZE = 100;

export const setupFaviconChanges = () => {
	const canvas = document.createElement('canvas');
	canvas.width = FAVICON_SIZE;
	canvas.height = FAVICON_SIZE;

	const ctx = canvas.getContext('2d');

	const image = new Image();

	image.addEventListener('load', () => {
		ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
		ctx.drawImage(image, 0, 0, FAVICON_SIZE, FAVICON_SIZE);

		ipcRenderer.send(EVENT_SERVER_FAVICON_CHANGED, {
			url: getServerUrl(),
			favicon: canvas.toDataURL(),
		});
	});

	const { Meteor } = window.require('meteor/meteor');
	const { Tracker } = window.require('meteor/tracker');
	const { settings } = window.require('/app/settings');

	Tracker.autorun(() => {
		const { url, defaultUrl } = settings.get('Assets_favicon') || {};
		const faviconUrl = url || defaultUrl;

		if (typeof faviconUrl !== 'string') {
			return;
		}

		image.src = Meteor.absoluteUrl(faviconUrl);
	});
};
