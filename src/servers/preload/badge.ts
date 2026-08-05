import { dispatch } from '../../store';
import { WEBVIEW_UNREAD_CHANGED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

let hasDispatched = false;
let lastBadge: Server['badge'];

export const setBadge = (badge: Server['badge']): void => {
  // The pre-7.8.0 Session autorun and the unread event listeners can both
  // re-emit unchanged values in rapid succession; a no-op dispatch still
  // re-renders every server-subscribed component in the root window.
  if (hasDispatched && Object.is(badge, lastBadge)) {
    return;
  }
  hasDispatched = true;
  lastBadge = badge;

  dispatch({
    type: WEBVIEW_UNREAD_CHANGED,
    payload: {
      url: getServerUrl(),
      badge,
    },
  });
};
