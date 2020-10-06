import { Notification, nativeImage, NativeImage } from 'electron';

import { invoke } from '../ipc/main';
import { dispatch, listen } from '../store';
import { getRootWindow } from '../ui/main/rootWindow';
import {
  NOTIFICATIONS_CREATE_REQUESTED,
  NOTIFICATIONS_CREATE_RESPONDED,
  NOTIFICATIONS_NOTIFICATION_SHOWN,
  NOTIFICATIONS_NOTIFICATION_CLOSED,
  NOTIFICATIONS_NOTIFICATION_CLICKED,
  NOTIFICATIONS_NOTIFICATION_REPLIED,
  NOTIFICATIONS_NOTIFICATION_ACTIONED,
  NOTIFICATIONS_NOTIFICATION_DISMISSED,
} from './actions';
import { ExtendedNotificationOptions } from './common';

const resolveIcon = async (iconUrl: string): Promise<NativeImage> => {
  if (!iconUrl) {
    return null;
  }

  if (/^data:/.test(iconUrl)) {
    return nativeImage.createFromDataURL(iconUrl);
  }

  try {
    const { webContents } = await getRootWindow();
    const dataUri = await invoke(webContents, 'notifications/fetch-icon', iconUrl);
    return nativeImage.createFromDataURL(dataUri);
  } catch (error) {
    console.error(error);
    return null;
  }
};

const notifications = new Map();

const createNotification = async (id: string, {
  title,
  body,
  icon,
  silent,
  canReply,
  actions,
}: ExtendedNotificationOptions): Promise<string> => {
  const notification = new Notification({
    title,
    body,
    icon: await resolveIcon(icon),
    silent,
    hasReply: canReply,
    actions: actions?.map((action) => ({
      type: 'button',
      text: action.title,
    })),
  });

  notification.addListener('show', () => {
    dispatch({ type: NOTIFICATIONS_NOTIFICATION_SHOWN, payload: { id } });
  });

  notification.addListener('close', () => {
    dispatch({ type: NOTIFICATIONS_NOTIFICATION_CLOSED, payload: { id } });
    notifications.delete(id);
  });

  notification.addListener('click', () => {
    dispatch({ type: NOTIFICATIONS_NOTIFICATION_CLICKED, payload: { id } });
  });

  notification.addListener('reply', (_event, reply) => {
    dispatch({ type: NOTIFICATIONS_NOTIFICATION_REPLIED, payload: { id, reply } });
  });

  notification.addListener('action', (_event, index) => {
    dispatch({ type: NOTIFICATIONS_NOTIFICATION_ACTIONED, payload: { id, index } });
  });

  notifications.set(id, notification);

  notification.show();

  return id;
};

const updateNotification = async (id: string, {
  title,
  body,
  silent,
  renotify,
}: ExtendedNotificationOptions): Promise<string> => {
  const notification = notifications.get(id);

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

  return id;
};

const handleCreateEvent = async ({
  tag,
  ...options
}: ExtendedNotificationOptions): Promise<string> => {
  if (tag && notifications.has(tag)) {
    return updateNotification(tag, options);
  }

  const id = tag || Math.random().toString(36).slice(2);
  return createNotification(id, options);
};

export const setupNotifications = (): void => {
  listen(NOTIFICATIONS_CREATE_REQUESTED, async (action) => {
    dispatch({
      type: NOTIFICATIONS_CREATE_RESPONDED,
      payload: await handleCreateEvent(action.payload),
      meta: {
        id: action.meta?.id,
        response: true,
      },
    });
  });

  listen(NOTIFICATIONS_NOTIFICATION_DISMISSED, (action) => {
    notifications.get(action.payload.id)?.close();
  });
};
