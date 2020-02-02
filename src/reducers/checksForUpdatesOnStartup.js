import {
	UPDATES_READY,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
} from '../actions';

export const checksForUpdatesOnStartup = (state = false, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { checksForUpdatesOnStartup } = payload;
			return checksForUpdatesOnStartup;
		}

		case ABOUT_DIALOG_TOGGLE_UPDATE_ON_START: {
			return payload;
		}

		default:
			return state;
	}
};
