import { Notification, nativeImage } from 'electron';

import * as notificationActions from '../common/actions/notificationActions';
import { dispatch } from '../common/store';
import type { ExtendedNotificationOptions } from '../common/types/ExtendedNotificationOptions';

const notifications = new Map<string, Notification>();

const createNotification = (
  id: string,
  {
    title,
    body,
    icon,
    silent,
    canReply,
    actions,
  }: Omit<ExtendedNotificationOptions, 'tag'>
): void => {
  const notification = new Notification({
    title,
    body: body ?? '',
    icon: icon ? nativeImage.createFromDataURL(icon) : undefined,
    silent,
    hasReply: canReply,
    actions: actions?.map((action) => ({
      type: 'button',
      text: action.title,
    })),
  });

  notification.addListener('show', () => {
    dispatch(notificationActions.shown(id));
  });

  notification.addListener('close', () => {
    dispatch(notificationActions.closed(id));
    notifications.delete(id);
  });

  notification.addListener('click', () => {
    dispatch(notificationActions.clicked(id));
  });

  notification.addListener('reply', (_event, reply) => {
    dispatch(notificationActions.replied(id, reply));
  });

  notification.addListener('action', (_event, index) => {
    dispatch(notificationActions.actioned(id, index));
  });

  notifications.set(id, notification);

  notification.show();
};

const updateNotification = (
  notification: Notification,
  { title, body, silent, renotify }: Omit<ExtendedNotificationOptions, 'tag'>
): void => {
  if (title) {
    notification.title = title;
  }

  if (body) {
    notification.body = body;
  }

  if (silent) {
    notification.silent = silent;
  }

  if (renotify) {
    notification.show();
  }
};

export const upsertNotification = ({
  tag,
  ...options
}: ExtendedNotificationOptions): void => {
  const notification = notifications.get(tag);

  if (notification) {
    updateNotification(notification, options);
    return;
  }

  createNotification(tag, options);
};

export const deleteNotification = (id: string): void => {
  notifications.get(id)?.close();
};
