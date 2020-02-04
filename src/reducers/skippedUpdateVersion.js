import { UPDATES_READY } from '../actions';

export const skippedUpdateVersion = (state = null, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { skippedUpdateVersion } = payload;
			return skippedUpdateVersion;
		}
	}
	return state;
};
