import { Notification, nativeImage, NativeImage } from 'electron';

import { invoke } from '../ipc/main';
import { dispatch, dispatchSingle, listen } from '../store';
import { ActionIPCMeta } from '../store/actions';
import { hasMeta } from '../store/fsa';
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

const resolveIcon = async (
  iconUrl: string | undefined
): Promise<NativeImage | undefined> => {
  if (!iconUrl) {
    return undefined;
  }

  if (/^data:/.test(iconUrl)) {
    return nativeImage.createFromDataURL(iconUrl);
  }

  try {
    const { webContents } = await getRootWindow();
    const dataUri = await invoke(
      webContents,
      'notifications/fetch-icon',
      iconUrl
    );
    return nativeImage.createFromDataURL(dataUri);
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

const notifications = new Map();

const createNotification = async (
  id: string,
  {
    title,
    subtitle,
    body,
    icon,
    silent,
    canReply,
    actions,
  }: ExtendedNotificationOptions,
  ipcMeta?: ActionIPCMeta
): Promise<string> => {
  const notification = new Notification({
    title,
    subtitle,
    body: body ?? '',
    icon: await resolveIcon(icon),
    silent,
    hasReply: canReply,
    actions: actions?.map((action) => ({
      type: 'button',
      text: action.title,
    })),
  });

  notification.addListener('show', () => {
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_SHOWN,
      payload: { id },
      ipcMeta,
    });
  });

  notification.addListener('close', () => {
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_CLOSED,
      payload: { id },
      ipcMeta,
    });
    notifications.delete(id);
  });

  notification.addListener('click', () => {
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_CLICKED,
      payload: { id, title },
      ipcMeta,
    });
  });

  notification.addListener('reply', (_event, reply) => {
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id, reply },
      ipcMeta,
    });
  });

  notification.addListener('action', (_event, index) => {
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_ACTIONED,
      payload: { id, index },
      ipcMeta,
    });
  });

  notifications.set(id, notification);

  notification.show();

  return id;
};

const updateNotification = async (
  id: string,
  { title, body, silent, renotify }: ExtendedNotificationOptions
): Promise<string> => {
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

const handleCreateEvent = async (
  { tag, ...options }: ExtendedNotificationOptions,
  ipcMeta?: ActionIPCMeta
): Promise<string> => {
  if (tag && notifications.has(tag)) {
    return updateNotification(tag, options);
  }

  const id = tag || Math.random().toString(36).slice(2);
  return createNotification(id, options, ipcMeta);
};

export const setupNotifications = (): void => {
  listen(NOTIFICATIONS_CREATE_REQUESTED, async (action) => {
    if (!hasMeta(action)) {
      return;
    }
    dispatch({
      type: NOTIFICATIONS_CREATE_RESPONDED,
      payload: await handleCreateEvent(action.payload, action.ipcMeta),
      meta: {
        id: action.meta.id,
        response: true,
      },
    });
  });

  listen(NOTIFICATIONS_NOTIFICATION_DISMISSED, (action) => {
    notifications.get(action.payload.id)?.close();
  });
};
