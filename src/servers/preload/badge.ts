import { dispatch } from '../../store';
import { WEBVIEW_UNREAD_CHANGED } from '../../ui/actions';
import { Server } from '../common';
import { getServerUrl } from './getServerUrl';

export const listenToBadgeChanges = (): void => {
  const { Session } = window.require('meteor/session');
  const { Tracker } = window.require('meteor/tracker');

  Tracker.autorun(() => {
    const badge: Server['badge'] = Session.get('unread');

    dispatch({
      type: WEBVIEW_UNREAD_CHANGED,
      payload: {
        url: getServerUrl(),
        badge,
      },
    });
  });
};
