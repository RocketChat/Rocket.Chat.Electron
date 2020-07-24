import {
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	UPDATES_READY,
	PERSISTABLE_VALUES_MERGED,
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

		case PERSISTABLE_VALUES_MERGED: {
			const { doCheckForUpdatesOnStartup = state } = payload;
			return doCheckForUpdatesOnStartup;
		}
	}
	return state;
};
