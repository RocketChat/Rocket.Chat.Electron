import { UPDATES_READY } from '../actions';

export const isUpdatingEnabled = (state = true, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { isUpdatingEnabled } = payload;
			return isUpdatingEnabled;
		}
	}
	return state;
};
