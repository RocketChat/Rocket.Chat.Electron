import { ipcRenderer } from 'electron';
import { getMeteor, getTracker, getSettings } from './rocketChat';


function handleTitleChange() {
	const Meteor = getMeteor();
	const Tracker = getTracker();
	const settings = getSettings();

	if (!Meteor || !Tracker || !settings) {
		return;
	}

	Meteor.startup(() => {
		Tracker.autorun(() => {
			const siteName = settings.get('Site_Name');
			if (siteName) {
				ipcRenderer.sendToHost('title-changed', siteName);
			}
		});
	});
}


export default () => {
	window.addEventListener('load', handleTitleChange);
};
