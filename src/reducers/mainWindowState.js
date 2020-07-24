import {
	ROOT_WINDOW_STATE_CHANGED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const mainWindowState = (state = {
	focused: true,
	visible: true,
	maximized: false,
	minimized: false,
	fullscreen: false,
	normal: true,
	bounds: {
		x: undefined,
		y: undefined,
		width: 1000,
		height: 600,
	},
}, { type, payload }) => {
	switch (type) {
		case ROOT_WINDOW_STATE_CHANGED:
			return payload;

		case PERSISTABLE_VALUES_MERGED: {
			const { mainWindowState } = payload;
			return mainWindowState;
		}
	}

	return state;
};
