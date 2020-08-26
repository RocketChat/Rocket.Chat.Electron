import {
  WEBVIEW_MESSAGE_BOX_FOCUSED,
  WEBVIEW_MESSAGE_BOX_BLURRED,
  TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
  TouchBarFormatButtonTouchedAction,
} from '../../actions';
import { dispatch, listen } from '../../store';

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

export const listenToMessageBoxEvents = (): void => {
  listen(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, (action: TouchBarFormatButtonTouchedAction) => {
    if (!focusedMessageBoxInput) {
      return;
    }

    const { payload: buttonId } = action;
    const {
      formattingButtons,
      applyFormatting,
    }: {
      formattingButtons: {
        pattern: string;
        condition?: () => boolean;
        label: string;
      }[];
      applyFormatting: (pattern: string, messageBoxInput: Element) => void;
    } = window.require('/app/ui-message/client/messageBox/messageBoxFormatting');

    const { pattern } = formattingButtons
      .filter(({ condition }) => !condition || condition())
      .find(({ label }) => label === buttonId) || {};

    if (!pattern) {
      return;
    }

    applyFormatting(pattern, focusedMessageBoxInput);
  });

  document.addEventListener('focus', handleFocusEvent, true);
  document.addEventListener('blur', handleBlurEvent, true);
};
