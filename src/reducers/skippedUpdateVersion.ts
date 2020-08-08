import { AnyAction } from 'redux';

import {
	UPDATES_READY,
	PERSISTABLE_VALUES_MERGED,
	UPDATE_SKIPPED,
} from '../actions';

export const skippedUpdateVersion = (state = null, { type, payload }: AnyAction): string | null => {
	switch (type) {
		case UPDATES_READY: {
			const { skippedUpdateVersion } = payload;
			return skippedUpdateVersion;
		}

		case UPDATE_SKIPPED: {
			const skippedUpdateVersion = payload;
			return skippedUpdateVersion;
		}

		case PERSISTABLE_VALUES_MERGED: {
			const { skippedUpdateVersion = state } = payload;
			return skippedUpdateVersion;
		}
	}
	return state;
};
