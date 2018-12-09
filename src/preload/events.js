import { ipcRenderer } from 'electron';


const handleWindowEventTriggered = (window, eventName) => (e) => {
	ipcRenderer.sendToHost(eventName, e.detail);
};


const handleTitleChange = (window) => {
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


const handleUserPresenceChange = (window) => {
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


const preventUrlLoadingOnDrop = ({ document }) => {
	document.addEventListener('dragover', (e) => e.preventDefault());
	document.addEventListener('drop', (e) => e.preventDefault());
};


export default (window) => {
	const eventsListened = ['unread-changed', 'get-sourceId', 'user-status-manually-set'];

	for (const eventName of eventsListened) {
		window.addEventListener(eventName, handleWindowEventTriggered(window, eventName));
	}

	window.addEventListener('load', () => {
		handleTitleChange(window);
		handleUserPresenceChange(window);
	});

	preventUrlLoadingOnDrop(window);
};
