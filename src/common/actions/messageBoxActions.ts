import { createAction } from '@reduxjs/toolkit';

export const focused = createAction('messageBox/focused');

export const blurred = createAction('messageBox/blurred');

export const formatButtonClicked = createAction(
  'messageBox/formatButtonClicked',
  (buttonId: 'bold' | 'italic' | 'strike' | 'inline_code' | 'multi_line') => ({
    payload: {
      buttonId,
    },
  })
);
