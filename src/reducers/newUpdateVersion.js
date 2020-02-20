import {
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
} from '../actions';

export const newUpdateVersion = (state = null, { type, payload }) => {
	switch (type) {
		case UPDATES_NEW_VERSION_AVAILABLE:
			return payload;

		case UPDATES_NEW_VERSION_NOT_AVAILABLE:
			return null;
	}

	return state;
};
