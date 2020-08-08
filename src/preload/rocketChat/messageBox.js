import { takeEvery, call } from 'redux-saga/effects';

import {
	WEBVIEW_MESSAGE_BOX_FOCUSED,
	WEBVIEW_MESSAGE_BOX_BLURRED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
} from '../../actions';
import { dispatch } from '../../channels';

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
	document.addEventListener('focus', handleFocusEvent, true);
	document.addEventListener('blur', handleBlurEvent, true);
};

export function *takeMessageBoxActions() {
	yield takeEvery(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, function *(action) {
		if (!focusedMessageBoxInput) {
			return;
		}

		const { payload: buttonId } = action;
		yield call(() => {
			const {
				formattingButtons,
				applyFormatting,
			} = window.require('/app/ui-message/client/messageBox/messageBoxFormatting');

			const { pattern } = formattingButtons
				.filter(({ condition }) => !condition || condition())
				.find(({ label }) => label === buttonId) || {};

			if (!pattern) {
				return;
			}

			applyFormatting(pattern, focusedMessageBoxInput);
		});
	});
}
