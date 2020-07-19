import { ROOT_WINDOW_WEBCONTENTS_FOCUSED } from '../actions';

export const focusedWebContentsId = (state = -1, { type, payload }) => {
	switch (type) {
		case ROOT_WINDOW_WEBCONTENTS_FOCUSED:
			return payload;
	}

	return state;
};
