import { AnyAction } from 'redux';

import { APP_VERSION_SET } from '../actions';

export const appVersion = (state = null, { type, payload }: AnyAction): string | null => {
	switch (type) {
		case APP_VERSION_SET:
			return payload;
	}

	return state;
};
