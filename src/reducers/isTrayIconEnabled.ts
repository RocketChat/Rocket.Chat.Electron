import { AnyAction } from 'redux';

import {
	MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const isTrayIconEnabled = (state = process.platform !== 'linux', { type, payload }: AnyAction): boolean => {
	switch (type) {
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
