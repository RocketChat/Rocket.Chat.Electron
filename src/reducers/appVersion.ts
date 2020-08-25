import { Reducer } from 'redux';

import {
	APP_VERSION_SET,
	AppVersionActionTypes,
} from '../actions';

export const appVersion: Reducer<string | null, AppVersionActionTypes> = (state = null, action) => {
	switch (action.type) {
		case APP_VERSION_SET:
			return action.payload;

		default:
			return state;
	}
};
