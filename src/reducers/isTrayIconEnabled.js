import {
	MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
	PREFERENCES_READY,
} from '../actions';

export const isTrayIconEnabled = (state = process.platform !== 'linux', { type, payload }) => {
	switch (type) {
		case PREFERENCES_READY: {
			const { isTrayIconEnabled } = payload;
			return isTrayIconEnabled;
		}

		case MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED:
			return payload;
	}

	return state;
};
