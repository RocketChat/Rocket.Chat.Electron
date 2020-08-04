import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';
import { SEND_TITLE_CHANGED } from '../../ipc';

export const setupTitleChanges = () => {
	const { Tracker } = window.require('meteor/tracker');
	const { settings } = window.require('/app/settings');

	Tracker.autorun(() => {
		const siteName = settings.get('Site_Name');
		if (typeof siteName !== 'string') {
			return;
		}

		const payload = {
			url: getServerUrl(),
			title: siteName,
		};
		ipcRenderer.send(SEND_TITLE_CHANGED, payload);
	});
};
