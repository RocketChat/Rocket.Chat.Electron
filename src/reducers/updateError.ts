import { Reducer } from 'redux';

import {
	UPDATES_CHECKING_FOR_UPDATE,
	UPDATES_ERROR_THROWN,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UpdateErrorActionTypes,
} from '../actions';

export const updateError: Reducer<Error | null, UpdateErrorActionTypes> = (state = null, action) => {
	switch (action.type) {
		case UPDATES_CHECKING_FOR_UPDATE:
			return null;

		case UPDATES_ERROR_THROWN:
			return action.payload;

		case UPDATES_NEW_VERSION_NOT_AVAILABLE:
			return null;

		case UPDATES_NEW_VERSION_AVAILABLE:
			return null;

		default:
			return state;
	}
};
