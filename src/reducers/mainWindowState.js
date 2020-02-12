import {
	MAIN_WINDOW_STATE_CHANGED,
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
		case MAIN_WINDOW_STATE_CHANGED:
			return payload;
	}

	return state;
};
