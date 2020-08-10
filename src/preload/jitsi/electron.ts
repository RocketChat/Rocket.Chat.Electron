import { desktopCapturer, SourcesOptions, DesktopCapturerSource } from 'electron';

interface IJitsiMeetElectron {
	obtainDesktopStreams: (
		callback: (sources: DesktopCapturerSource[]) => void,
		errorCallback: (error: Error) => void,
		options: SourcesOptions,
	) => Promise<void>;
}

declare global {
	interface Window {
		JitsiMeetElectron: IJitsiMeetElectron;
	}
}

const JitsiMeetElectron: IJitsiMeetElectron = {
	async obtainDesktopStreams(callback, errorCallback, options): Promise<void> {
		try {
			callback(await desktopCapturer.getSources(options));
		} catch (error) {
			errorCallback(error);
		}
	},
};

export const setupJitsiMeetElectron = (): void => {
	window.JitsiMeetElectron = JitsiMeetElectron;
};
