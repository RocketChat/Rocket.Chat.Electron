import { WEBVIEW_UNREAD_CHANGED } from '../../common/actions/uiActions';
import type { Server } from '../../common/types/Server';
import { dispatch } from '../../store';
import { getServerUrl } from './urls';

export const setBadge = (badge: Server['badge']): void => {
  dispatch({
    type: WEBVIEW_UNREAD_CHANGED,
    payload: {
      url: getServerUrl(),
      badge,
    },
  });
};
