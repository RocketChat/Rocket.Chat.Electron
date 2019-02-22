import { ipcRenderer } from 'electron';


const getMeteor = () => window.Meteor || (window.require && window.require('meteor/meteor').Meteor);
const getTracker = () => window.Tracker || (window.require && window.require('meteor/tracker').Tracker);
const getSettings = () => (
	(window.RocketChat && window.RocketChat.settings) ||
		(window.require && window.require('meteor/rocketchat:settings').settings)
);

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
