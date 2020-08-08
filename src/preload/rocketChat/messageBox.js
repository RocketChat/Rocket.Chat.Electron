import { ipcRenderer } from 'electron';

import {
	WEBVIEW_MESSAGE_BOX_FOCUSED,
	WEBVIEW_MESSAGE_BOX_BLURRED,
} from '../../actions';
import { dispatch } from '../../channels';
import {
	EVENT_FORMAT_BUTTON_TOUCHED,
} from '../../ipc';

let focusedMessageBoxInput = null;

const handleFocusEvent = (event) => {
	if (!event.target.classList.contains('js-input-message')) {
		return;
	}

	focusedMessageBoxInput = event.target;
	dispatch({ type: WEBVIEW_MESSAGE_BOX_FOCUSED });
};

const handleBlurEvent = (event) => {
	if (!event.target.classList.contains('js-input-message')) {
		return;
	}

	focusedMessageBoxInput = null;
	dispatch({ type: WEBVIEW_MESSAGE_BOX_BLURRED });
};

export const setupMessageBoxEvents = () => {
	const {
		formattingButtons,
		applyFormatting,
	} = window.require('/app/ui-message/client/messageBox/messageBoxFormatting');

	document.addEventListener('focus', handleFocusEvent, true);
	document.addEventListener('blur', handleBlurEvent, true);

	ipcRenderer.addListener(EVENT_FORMAT_BUTTON_TOUCHED, (event, buttonId) => {
		if (!focusedMessageBoxInput) {
			return;
		}

		const { pattern } = formattingButtons
			.filter(({ condition }) => !condition || condition())
			.find(({ label }) => label === buttonId) || {};

		if (!pattern) {
			return;
		}

		applyFormatting(pattern, focusedMessageBoxInput);
	});
};
