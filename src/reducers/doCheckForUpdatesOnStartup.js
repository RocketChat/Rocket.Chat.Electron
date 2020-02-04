import {
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	UPDATES_READY,
} from '../actions';

export const doCheckForUpdatesOnStartup = (state = true, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { doCheckForUpdatesOnStartup } = payload;
			return doCheckForUpdatesOnStartup;
		}

		case ABOUT_DIALOG_TOGGLE_UPDATE_ON_START: {
			const doCheckForUpdatesOnStartup = payload;
			return doCheckForUpdatesOnStartup;
		}
	}
	return state;
};
