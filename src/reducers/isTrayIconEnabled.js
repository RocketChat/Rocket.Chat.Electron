import {
	MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
	PREFERENCES_READY,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const isTrayIconEnabled = (state = process.platform !== 'linux', { type, payload }) => {
	switch (type) {
		case PREFERENCES_READY: {
			const { isTrayIconEnabled } = payload;
			return isTrayIconEnabled;
		}

		case MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED: {
			return payload;
		}

		case PERSISTABLE_VALUES_MERGED: {
			const { isTrayIconEnabled = state } = payload;
			return isTrayIconEnabled;
		}
	}

	return state;
};
