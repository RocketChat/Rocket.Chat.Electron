import { desktopCapturer } from 'electron';

const JitsiMeetElectron = {
	obtainDesktopStreams(callback, errorCallback, options = {}) {
		console.log(this);
		desktopCapturer.getSources(options, (error, sources) => {
			if (error) {
				errorCallback(error);
				return;
			}

			callback(sources);
		});
	},
};

export default JitsiMeetElectron;
