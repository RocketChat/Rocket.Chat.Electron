import { UPDATES_READY } from '../actions';

export const isUpdatingAllowed = (state = true, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { isUpdatingAllowed } = payload;
			return isUpdatingAllowed;
		}
	}
	return state;
};
