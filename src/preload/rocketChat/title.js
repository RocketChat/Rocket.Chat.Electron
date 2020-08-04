import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';
import { EVENT_SERVER_TITLE_CHANGED } from '../../ipc';

export const setupTitleChanges = () => {
	const { Tracker } = window.require('meteor/tracker');
	const { settings } = window.require('/app/settings');

	Tracker.autorun(() => {
		const siteName = settings.get('Site_Name');
		if (typeof siteName !== 'string') {
			return;
		}

		ipcRenderer.send(EVENT_SERVER_TITLE_CHANGED, {
			url: getServerUrl(),
			title: siteName,
		});
	});
};
