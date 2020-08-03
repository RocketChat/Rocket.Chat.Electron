import { desktopCapturer } from 'electron';

export const setupJitsiMeetElectron = () => {
	const JitsiMeetElectron = {
		async obtainDesktopStreams(callback, errorCallback, options = {}) {
			try {
				callback(await desktopCapturer.getSources(options));
			} catch (error) {
				errorCallback(error);
			}
		},
	};

	window.JitsiMeetElectron = JitsiMeetElectron;
};
