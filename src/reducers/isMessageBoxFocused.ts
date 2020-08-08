import { AnyAction } from 'redux';

import {
	WEBVIEW_MESSAGE_BOX_FOCUSED,
	WEBVIEW_MESSAGE_BOX_BLURRED,
	WEBVIEW_DID_START_LOADING,
	WEBVIEW_DID_FAIL_LOAD,
} from '../actions';

export const isMessageBoxFocused = (state = false, { type }: AnyAction): boolean => {
	switch (type) {
		case WEBVIEW_MESSAGE_BOX_FOCUSED:
			return true;

		case WEBVIEW_DID_START_LOADING:
		case WEBVIEW_MESSAGE_BOX_BLURRED:
		case WEBVIEW_DID_FAIL_LOAD:
			return false;
	}

	return state;
};
