import {
	MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
	PREFERENCES_READY,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const isShowWindowOnUnreadChangedEnabled = (state = false, { type, payload }) => {
	switch (type) {
		case PREFERENCES_READY: {
			const { isShowWindowOnUnreadChangedEnabled } = payload;
			return isShowWindowOnUnreadChangedEnabled;
		}

		case MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED:
			return payload;

		case PERSISTABLE_VALUES_MERGED: {
			const { isShowWindowOnUnreadChangedEnabled } = payload;
			return isShowWindowOnUnreadChangedEnabled;
		}
	}

	return state;
};
