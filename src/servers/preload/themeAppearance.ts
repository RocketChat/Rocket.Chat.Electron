import type { ThemeAppearance } from '@rocket.chat/desktop-api';

export const setUserThemeAppearance = (
  _themeAppearance: ThemeAppearance
): void => {
  // No-op: Theme appearance is now managed globally via userThemePreference
  // This function is kept for backwards compatibility with the desktop-api interface
};
