import { AnyAction } from 'redux';

import {
	MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const isShowWindowOnUnreadChangedEnabled = (state = false, { type, payload }: AnyAction): boolean => {
	switch (type) {
		case MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED:
			return payload;

		case PERSISTABLE_VALUES_MERGED: {
			const { isShowWindowOnUnreadChangedEnabled = state } = payload;
			return isShowWindowOnUnreadChangedEnabled;
		}
	}

	return state;
};
