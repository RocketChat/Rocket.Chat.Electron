import { AnyAction } from 'redux';

import {
	MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const isMenuBarEnabled = (state = true, { type, payload }: AnyAction): boolean => {
	switch (type) {
		case MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED: {
			return payload;
		}

		case PERSISTABLE_VALUES_MERGED: {
			const { isMenuBarEnabled = state } = payload;
			return isMenuBarEnabled;
		}
	}

	return state;
};
