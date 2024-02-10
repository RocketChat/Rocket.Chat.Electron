import { dispatch } from '../../store';
import { WEBVIEW_USER_THEME_APPEARANCE_CHANGED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

export const setUserThemeAppearance = (
  themeAppearance: Server['themeAppearance']
): void => {
  dispatch({
    type: WEBVIEW_USER_THEME_APPEARANCE_CHANGED,
    payload: {
      url: getServerUrl(),
      themeAppearance,
    },
  });
};
