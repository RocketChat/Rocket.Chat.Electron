import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_USER_THEME_PREFERENCE_CHANGED } from '../actions';

type UserThemePreferenceAction =
  | ActionOf<typeof SETTINGS_USER_THEME_PREFERENCE_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

type ThemeValue = 'auto' | 'light' | 'dark';

const isValidTheme = (value: unknown): value is ThemeValue =>
  value === 'auto' || value === 'light' || value === 'dark';

export const userThemePreference: Reducer<
  ThemeValue,
  UserThemePreferenceAction
> = (state = 'auto', action) => {
  switch (action.type) {
    case SETTINGS_USER_THEME_PREFERENCE_CHANGED:
      if (isValidTheme(action.payload)) {
        return action.payload;
      }
      console.warn(
        `Invalid payload for ${SETTINGS_USER_THEME_PREFERENCE_CHANGED}: ${action.payload}`
      );
      return state;

    case APP_SETTINGS_LOADED: {
      const { userThemePreference = state } = action.payload;
      if (isValidTheme(userThemePreference)) {
        return userThemePreference;
      }
      console.warn(
        `Invalid userThemePreference in settings: ${userThemePreference}`
      );
      return state;
    }

    default:
      return state;
  }
};
