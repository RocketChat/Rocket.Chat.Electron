import {
	MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
	PREFERENCES_READY,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const isMenuBarEnabled = (state = true, { type, payload }) => {
	switch (type) {
		case PREFERENCES_READY: {
			const { isMenuBarEnabled } = payload;
			return isMenuBarEnabled;
		}

		case MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED: {
			return payload;
		}

		case PERSISTABLE_VALUES_MERGED: {
			const { isMenuBarEnabled } = payload;
			return isMenuBarEnabled;
		}
	}

	return state;
};
