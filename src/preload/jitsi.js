import url from 'url';

import { desktopCapturer, remote } from 'electron';

import { getSettings } from './rocketChat';


const JitsiMeetElectron = {
	async obtainDesktopStreams(callback, errorCallback, options = {}) {
		try {
			callback(await desktopCapturer.getSources(options));
		} catch (error) {
			errorCallback(error);
		}
	},
};

const wrapWindowOpen = (defaultWindowOpen) => (href, frameName, features) => {
	const settings = getSettings();

	if (settings && url.parse(href).host === settings.get('Jitsi_Domain')) {
		features = [
			features,
			'nodeIntegration=true',
			`preload=${ `${ remote.app.getAppPath() }/app/preload.js` }`,
		].join(',');
	}

	return defaultWindowOpen.call(window, href, frameName, features);
};


const pollJitsiIframe = () => {
	const jitsiIframe = document.querySelector('iframe[id^=jitsiConference]');
	if (!jitsiIframe) {
		return;
	}

	jitsiIframe.contentWindow.JitsiMeetElectron = JitsiMeetElectron;
};


export default () => {
	window.JitsiMeetElectron = JitsiMeetElectron;
	window.open = wrapWindowOpen(window.open);

	window.addEventListener('load', () => {
		setInterval(pollJitsiIframe, 1000);
	});
};
