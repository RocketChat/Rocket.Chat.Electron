import { dispatch, listen } from '../../store';
import {
  WEBVIEW_MESSAGE_BOX_FOCUSED,
  WEBVIEW_MESSAGE_BOX_BLURRED,
  TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
} from '../actions';

let focusedMessageBoxInput: Element | null = null;

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

export const listenToMessageBoxEvents = (): void => {
  listen(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, (action) => {
    if (!focusedMessageBoxInput) {
      return;
    }

    const { payload: buttonId } = action;

    const ancestor = focusedMessageBoxInput.closest('.rc-message-box');
    const button = ancestor?.querySelector<HTMLButtonElement>(
      `[data-id='${buttonId}']`
    );
    button?.click();
  });

  document.addEventListener('focus', handleFocusEvent, true);
  document.addEventListener('blur', handleBlurEvent, true);
};
