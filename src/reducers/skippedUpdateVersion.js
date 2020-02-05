import {
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATES_READY,
} from '../actions';

export const skippedUpdateVersion = (state = null, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { skippedUpdateVersion } = payload;
			return skippedUpdateVersion;
		}

		case UPDATE_DIALOG_SKIP_UPDATE_CLICKED: {
			const skippedUpdateVersion = payload;
			return skippedUpdateVersion;
		}
	}
	return state;
};
