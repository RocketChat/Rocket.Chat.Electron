import { AnyAction } from 'redux';

import { UPDATES_READY, PERSISTABLE_VALUES_MERGED } from '../actions';

export const isUpdatingEnabled = (state = true, { type, payload }: AnyAction): boolean => {
	switch (type) {
		case UPDATES_READY: {
			const { isUpdatingEnabled } = payload;
			return isUpdatingEnabled;
		}

		case PERSISTABLE_VALUES_MERGED: {
			const { isUpdatingEnabled = state } = payload;
			return isUpdatingEnabled;
		}
	}
	return state;
};
