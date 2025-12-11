import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_USER_THEME_PREFERENCE_CHANGED } from '../actions';

type UserThemePreferenceAction =
  | ActionOf<typeof SETTINGS_USER_THEME_PREFERENCE_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const userThemePreference: Reducer<
  'auto' | 'light' | 'dark',
  UserThemePreferenceAction
> = (state = 'auto', action) => {
  switch (action.type) {
    case SETTINGS_USER_THEME_PREFERENCE_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { userThemePreference = state } = action.payload;
      return userThemePreference;
    }

    default:
      return state;
  }
};

