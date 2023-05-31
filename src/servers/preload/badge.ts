import { getServerUrl } from './urls';
import { dispatch } from '../../store';
import { WEBVIEW_UNREAD_CHANGED } from '../../ui/actions';
import type { Server } from '../common';

export const setBadge = (badge: Server['badge']): void => {
  dispatch({
    type: WEBVIEW_UNREAD_CHANGED,
    payload: {
      url: getServerUrl(),
      badge,
    },
  });
};
