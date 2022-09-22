import { dispatch } from '../../store';
import { WEBVIEW_ALLOWED_REDIRECTS_CHANGED } from '../../ui/actions';
import { Server } from '../common';
import { getServerUrl } from './urls';

export const setServerAllowedRedirects = (
  allowedRedirects: Server['allowedRedirects']
): void => {
  dispatch({
    type: WEBVIEW_ALLOWED_REDIRECTS_CHANGED,
    payload: {
      url: getServerUrl(),
      allowedRedirects,
    },
  });
};
