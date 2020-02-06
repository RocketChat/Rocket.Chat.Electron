import {
	UPDATES_CHECKING_FOR_UPDATE,
	UPDATES_ERROR_THROWN,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
} from '../actions';

export const isCheckingForUpdates = (state = false, { type }) => {
	switch (type) {
		case UPDATES_CHECKING_FOR_UPDATE:
			return true;

		case UPDATES_ERROR_THROWN:
			return false;

		case UPDATES_NEW_VERSION_NOT_AVAILABLE:
			return false;

		case UPDATES_NEW_VERSION_AVAILABLE:
			return false;
	}

	return state;
};
