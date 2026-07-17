import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';

/**
 * Resolves the palette used for the app shell chrome (tab bar, sidebar,
 * title bar).
 *
 * The chrome is pinned to the dark palette so it reads well over the opaque
 * window background. When transparency is enabled the desktop shows through, so
 * we follow the user's resolved theme ('auto' tracks the OS) to keep chrome
 * text legible over a light background.
 */
export const useShellTheme = (): 'light' | 'dark' => {
  const isTransparentWindowEnabled = useSelector(
    ({ isTransparentWindowEnabled }: RootState) => isTransparentWindowEnabled
  );
  const machineTheme = useSelector(
    ({ machineTheme }: RootState) => machineTheme
  );
  const userThemePreference = useSelector(
    ({ userThemePreference }: RootState) => userThemePreference
  );

  const resolvedTheme =
    userThemePreference === 'auto' ? machineTheme : userThemePreference;

  return isTransparentWindowEnabled && resolvedTheme === 'light'
    ? 'light'
    : 'dark';
};
