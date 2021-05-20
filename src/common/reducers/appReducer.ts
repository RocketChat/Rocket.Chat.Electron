import { createReducer } from '@reduxjs/toolkit';

import * as spellCheckingActions from '../actions/spellCheckingActions';

type State = {
  readonly name: string;
  readonly version: string;
  readonly path: string;
  readonly platform: NodeJS.Platform;
  readonly locale: string;
  readonly bugsnagApiKey: string | undefined;
  readonly spellCheckerLanguages: {
    current: string[];
    available: string[];
  };
};

export const appReducer = createReducer<State>(
  {
    name: '',
    version: '',
    path: '',
    platform: 'linux',
    locale: 'en-US',
    bugsnagApiKey: undefined,
    spellCheckerLanguages: {
      current: [],
      available: [],
    },
  },
  (builder) =>
    builder
      .addCase(spellCheckingActions.toggled, (state, action) => {
        const { enabled } = action.payload;

        if (enabled) {
          state.spellCheckerLanguages.current =
            state.spellCheckerLanguages.available;
        } else {
          state.spellCheckerLanguages.current = [];
        }
      })
      .addCase(spellCheckingActions.languageToggled, (state, action) => {
        const { language, enabled } = action.payload;

        const set = new Set(state.spellCheckerLanguages.current);

        if (enabled) {
          set.add(language);
        } else {
          set.delete(language);
        }

        state.spellCheckerLanguages.current = Array.from(set).filter(
          (language) => state.spellCheckerLanguages.available.includes(language)
        );
      })
);
