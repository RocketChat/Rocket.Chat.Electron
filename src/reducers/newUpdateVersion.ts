import { Reducer } from 'redux';

import {
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	NewUpdateVersionActionTypes,
} from '../actions';

export const newUpdateVersion: Reducer<string | null, NewUpdateVersionActionTypes> = (state = null, action) => {
	switch (action.type) {
		case UPDATES_NEW_VERSION_AVAILABLE:
			return action.payload;

		case UPDATES_NEW_VERSION_NOT_AVAILABLE:
			return null;

		default:
			return state;
	}
};
