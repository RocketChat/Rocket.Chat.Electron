import {
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	SERVERS_UPDATED,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_SERVER_SELECTED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	WEBVIEW_FOCUS_REQUESTED,
} from '../actions';

export const currentServerUrl = (state = [], { type, payload }) => {
	switch (type) {
		case MENU_BAR_ADD_NEW_SERVER_CLICKED:
			return null;

		case MENU_BAR_SELECT_SERVER_CLICKED: {
			const { url } = payload;
			return url;
		}

		case TOUCH_BAR_SELECT_SERVER_TOUCHED:
			return payload;

		case SIDE_BAR_SERVER_SELECTED:
			return payload;

		case SIDE_BAR_REMOVE_SERVER_CLICKED: {
			if (state === payload) {
				return null;
			}
			return state;
		}

		case SIDE_BAR_ADD_NEW_SERVER_CLICKED:
			return null;

		case WEBVIEW_FOCUS_REQUESTED: {
			const { url } = payload;
			return url;
		}

		case SERVERS_UPDATED: {
			const { currentServerUrl } = payload;
			return currentServerUrl;
		}

		default:
			return state;
	}
};
