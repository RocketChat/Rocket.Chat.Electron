import { desktopCapturer } from 'electron';
import path from 'path';
import url from 'url';


const JitsiMeetElectron = {
	obtainDesktopStreams(callback, errorCallback, options = {}) {
		desktopCapturer.getSources(options, (error, sources) => {
			if (error) {
				errorCallback(error);
				return;
			}

			callback(sources);
		});
	},
};


const wrapWindowOpen = (defaultWindowOpen) => (href, frameName, features) => {
	const { RocketChat } = window;

	if (RocketChat && url.parse(href).host === RocketChat.settings.get('Jitsi_Domain')) {
		features = [
			features,
			'nodeIntegration=true',
			`preload=${ path.join(__dirname, './preload.js') }`,
		].filter((x) => Boolean(x)).join(',');
	}

	return defaultWindowOpen(href, frameName, features);
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
