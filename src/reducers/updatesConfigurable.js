import {
	UPDATES_READY,
} from '../actions';

export const updatesConfigurable = (state = false, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { updatesConfigurable } = payload;
			return updatesConfigurable;
		}

		default:
			return state;
	}
};
