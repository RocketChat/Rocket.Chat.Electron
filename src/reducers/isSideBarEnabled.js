import {
	MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const isSideBarEnabled = (state = true, { type, payload }) => {
	switch (type) {
		case MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED:
			return payload;

		case PERSISTABLE_VALUES_MERGED: {
			const { isSideBarEnabled = state } = payload;
			return isSideBarEnabled;
		}
	}

	return state;
};
