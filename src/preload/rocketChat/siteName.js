import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';

export const setupSiteNameChanges = () => {
	const { Tracker } = window.require('meteor/tracker');
	const { settings } = window.require('/app/settings');

	Tracker.autorun(() => {
		const siteName = settings.get('Site_Name');
		if (typeof siteName !== 'string') {
			return;
		}

		getServerUrl()
			.then((url) => ({ url, title: siteName }))
			.then((payload) => {
				ipcRenderer.send('title-changed', payload);
			});
	});
};
