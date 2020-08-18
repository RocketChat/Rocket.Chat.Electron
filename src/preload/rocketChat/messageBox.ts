import { AnyAction } from 'redux';
import { takeEvery, call, Effect } from 'redux-saga/effects';

import {
	WEBVIEW_MESSAGE_BOX_FOCUSED,
	WEBVIEW_MESSAGE_BOX_BLURRED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
} from '../../actions';
import { dispatch } from '../../channels';

let focusedMessageBoxInput: Element = null;

const handleFocusEvent = (event: FocusEvent): void => {
	if (!(event.target instanceof Element)) {
		return;
	}

	if (!event.target.classList.contains('js-input-message')) {
		return;
	}

	focusedMessageBoxInput = event.target;
	dispatch({ type: WEBVIEW_MESSAGE_BOX_FOCUSED });
};

const handleBlurEvent = (event: FocusEvent): void => {
	if (!(event.target instanceof Element)) {
		return;
	}

	if (!event.target.classList.contains('js-input-message')) {
		return;
	}

	focusedMessageBoxInput = null;
	dispatch({ type: WEBVIEW_MESSAGE_BOX_BLURRED });
};

export function *listenToMessageBoxEvents(): Generator<Effect> {
	yield call(() => {
		document.addEventListener('focus', handleFocusEvent, true);
		document.addEventListener('blur', handleBlurEvent, true);
	});

	yield takeEvery(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, function *(action: AnyAction) {
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
