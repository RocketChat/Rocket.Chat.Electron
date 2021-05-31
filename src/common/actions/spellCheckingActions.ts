import { createAction } from '@reduxjs/toolkit';

export const toggled = createAction(
  'spellChecking/toggled',
  (enabled: boolean) => ({
    payload: {
      enabled,
    },
  })
);

export const languageToggled = createAction(
  'spellChecking/languageToggled',
  (language: string, enabled: boolean) => ({
    payload: {
      language,
      enabled,
    },
  })
);
