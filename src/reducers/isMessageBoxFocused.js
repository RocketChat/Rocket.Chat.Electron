import { WEBVIEW_MESSAGE_BOX_FOCUSED, WEBVIEW_MESSAGE_BOX_BLURRED } from '../actions';

export const isMessageBoxFocused = (state = false, { type }) => {
	switch (type) {
		case WEBVIEW_MESSAGE_BOX_FOCUSED:
			return true;

		case WEBVIEW_MESSAGE_BOX_BLURRED:
			return false;
	}

	return state;
};
