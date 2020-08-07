import { AnyAction } from 'redux';

import { APP_PATH_SET } from '../actions';

export const appPath = (state = null, { type, payload }: AnyAction): string | null => {
	switch (type) {
		case APP_PATH_SET:
			return payload;
	}

	return state;
};
