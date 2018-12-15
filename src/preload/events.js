import { ipcRenderer } from 'electron';


const handleTitleChange = () => {
	const { Meteor, RocketChat, Tracker } = window;

	if (!Meteor || !RocketChat || !Tracker) {
		return;
	}

	Meteor.startup(() => {
		Tracker.autorun(() => {
			const siteName = RocketChat.settings.get('Site_Name');
			if (siteName) {
				ipcRenderer.sendToHost('title-changed', siteName);
			}
		});
	});
};


const handleUserPresenceChange = () => {
	const { Meteor, UserPresence } = window;

	if (!Meteor || !UserPresence) {
		return;
	}

	const idleDetectionInterval = 10000;
	setInterval(() => {
		try {
			const idleTime = ipcRenderer.sendSync('getSystemIdleTime');
			if (idleTime < idleDetectionInterval) {
				UserPresence.setOnline();
			}
		} catch (e) {
			console.error(`Error getting system idle time: ${ e }`);
		}
	}, idleDetectionInterval);
};


export default () => {
	document.addEventListener('dragover', (event) => event.preventDefault());
	document.addEventListener('drop', (event) => event.preventDefault());

	const eventsListened = ['unread-changed', 'get-sourceId', 'user-status-manually-set'];

	for (const eventName of eventsListened) {
		window.addEventListener(eventName, (event) => ipcRenderer.sendToHost(eventName, event.detail));
	}

	window.addEventListener('load', () => {
		handleTitleChange();
		handleUserPresenceChange();
	});
};
