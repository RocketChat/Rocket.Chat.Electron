import { AnyAction } from 'redux';

import {
	UPDATES_CHECKING_FOR_UPDATE,
	UPDATES_ERROR_THROWN,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
} from '../actions';

export const updateError = (state = null, { type, payload }: AnyAction): null | Error => {
	switch (type) {
		case UPDATES_CHECKING_FOR_UPDATE:
			return null;

		case UPDATES_ERROR_THROWN:
			return payload;

		case UPDATES_NEW_VERSION_NOT_AVAILABLE:
			return null;

		case UPDATES_NEW_VERSION_AVAILABLE:
			return null;
	}

	return state;
};
