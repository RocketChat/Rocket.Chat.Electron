import * as messageBoxActions from '../common/actions/messageBoxActions';
import { dispatch } from '../common/store';

let focusedMessageBoxInput: Element | null = null;

const handleFocusEvent = (event: FocusEvent): void => {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (!event.target.classList.contains('js-input-message')) {
    return;
  }

  focusedMessageBoxInput = event.target;
  dispatch(messageBoxActions.focused());
};

const handleBlurEvent = (event: FocusEvent): void => {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (!event.target.classList.contains('js-input-message')) {
    return;
  }

  focusedMessageBoxInput = null;
  dispatch(messageBoxActions.blurred());
};

export const attachMessageBoxEvents = (): void => {
  document.addEventListener('focus', handleFocusEvent, true);
  document.addEventListener('blur', handleBlurEvent, true);
};

export const triggerMessageBoxFormatButton = (
  buttonId: 'bold' | 'italic' | 'strike' | 'inline_code' | 'multi_line'
): void => {
  if (!focusedMessageBoxInput) {
    return;
  }

  const ancestor = focusedMessageBoxInput.closest('.rc-message-box');
  const button = ancestor?.querySelector<HTMLButtonElement>(
    `[data-id='${buttonId}']`
  );
  button?.click();
};
