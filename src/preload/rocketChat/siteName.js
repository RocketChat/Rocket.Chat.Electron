import { ipcRenderer } from 'electron';

export const setupSiteNameChanges = () => {
	const { Tracker } = window.require('meteor/tracker');
	const { settings } = window.require('/app/settings');

	Tracker.autorun(() => {
		const siteName = settings.get('Site_Name');
		if (typeof siteName !== 'string') {
			return;
		}

		ipcRenderer.sendToHost('title-changed', siteName);
	});
};
