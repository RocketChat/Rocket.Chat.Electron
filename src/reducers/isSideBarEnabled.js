import {
	MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
	PREFERENCES_READY,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const isSideBarEnabled = (state = true, { type, payload }) => {
	switch (type) {
		case PREFERENCES_READY: {
			const { isSideBarEnabled } = payload;
			return isSideBarEnabled;
		}

		case MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED:
			return payload;

		case PERSISTABLE_VALUES_MERGED: {
			const { isSideBarEnabled } = payload;
			return isSideBarEnabled;
		}
	}

	return state;
};
