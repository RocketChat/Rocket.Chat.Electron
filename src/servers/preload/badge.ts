import { dispatch } from '../../store';
import { WEBVIEW_UNREAD_CHANGED } from '../../ui/actions';
import { Server } from '../common';
import { getServerUrl } from './getServerUrl';

const handleUnreadEvent = (event: CustomEvent<Server['badge']>): void => {
  dispatch({
    type: WEBVIEW_UNREAD_CHANGED,
    payload: {
      url: getServerUrl(),
      badge: event.detail,
    },
  });
};

export const listenToBadgeChanges = (): void => {
  window.addEventListener('unread', handleUnreadEvent, { passive: false });
};
