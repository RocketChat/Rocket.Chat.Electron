import { desktopCapturer } from 'electron';

const JitsiMeetElectron = {
	async obtainDesktopStreams(callback, errorCallback, options = {}) {
		try {
			callback(await desktopCapturer.getSources(options));
		} catch (error) {
			errorCallback(error);
		}
	},
};

export const setupJitsiMeetElectron = () => {
	window.JitsiMeetElectron = JitsiMeetElectron;
};
