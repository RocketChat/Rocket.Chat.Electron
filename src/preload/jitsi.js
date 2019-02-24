import { desktopCapturer, remote } from 'electron';
import url from 'url';
import util from 'util';
const { app } = remote;


const getScreenSources = util.promisify(desktopCapturer.getSources.bind(desktopCapturer));
const JitsiMeetElectron = {
	async obtainDesktopStreams(callback, errorCallback, options = {}) {
		try {
			callback(await getScreenSources(options));
		} catch (error) {
			errorCallback(error);
		}
	},
};


const getSettings = () => (
	(window.RocketChat && window.RocketChat.settings) ||
		(window.require && window.require('meteor/rocketchat:settings').settings)
);

const wrapWindowOpen = (defaultWindowOpen) => (href, frameName, features) => {
	const settings = getSettings();

	if (settings && url.parse(href).host === settings.get('Jitsi_Domain')) {
		features = [
			features,
			'nodeIntegration=true',
			`preload=${ `${ app.getAppPath() }/app/preload.js` }`,
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
