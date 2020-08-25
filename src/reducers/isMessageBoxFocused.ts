import { Reducer } from 'redux';

import {
	WEBVIEW_MESSAGE_BOX_FOCUSED,
	WEBVIEW_MESSAGE_BOX_BLURRED,
	WEBVIEW_DID_START_LOADING,
	WEBVIEW_DID_FAIL_LOAD,
	IsMessageBoxFocusedActionTypes,
} from '../actions';

export const isMessageBoxFocused: Reducer<boolean, IsMessageBoxFocusedActionTypes> = (state = false, action) => {
	switch (action.type) {
		case WEBVIEW_MESSAGE_BOX_FOCUSED:
			return true;

		case WEBVIEW_DID_START_LOADING:
		case WEBVIEW_MESSAGE_BOX_BLURRED:
		case WEBVIEW_DID_FAIL_LOAD:
			return false;

		default:
			return state;
	}
};
