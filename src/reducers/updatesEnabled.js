import {
	UPDATES_READY,
} from '../actions';

export const updatesEnabled = (state = false, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { updatesEnabled } = payload;
			return updatesEnabled;
		}

		default:
			return state;
	}
};
