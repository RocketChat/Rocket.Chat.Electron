import type { NativeImage } from 'electron';
import { Notification, nativeImage } from 'electron';

import { invoke } from '../ipc/main';
import { dispatch, dispatchSingle, listen, select } from '../store';
import type { ActionIPCMeta } from '../store/actions';
import { hasMeta } from '../store/fsa';
import { getRootWindow } from '../ui/main/rootWindow';
import { getServerUrlByWebContentsId } from '../ui/main/serverView';
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
import attentionDrawing from './attentionDrawing';
import type { ExtendedNotificationOptions } from './common';
import { parseActivationArguments } from './parseActivationArguments';

type NotificationRoutingMeta = {
  ipcMeta?: ActionIPCMeta;
};

const MAX_ROUTING_ENTRIES = 200;

const shouldUseActivationRouting = (): boolean =>
  process.platform === 'win32' &&
  typeof Notification.handleActivation === 'function';

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
const notificationTypes = new Map<string, 'voice' | 'text'>();
const notificationCategories = new Map<string, 'DOWNLOADS' | 'SERVER'>();
const notificationRoutingMeta = new Map<string, NotificationRoutingMeta>();

const setNotificationRoutingMeta = (
  id: string,
  meta: NotificationRoutingMeta
): void => {
  notificationRoutingMeta.set(id, meta);

  if (notificationRoutingMeta.size > MAX_ROUTING_ENTRIES) {
    const oldestId = notificationRoutingMeta.keys().next().value;
    if (oldestId !== undefined) {
      notificationRoutingMeta.delete(oldestId);
    }
  }
};

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
    requireInteraction,
    category,
  }: ExtendedNotificationOptions,
  ipcMeta?: ActionIPCMeta
): Promise<string> => {
  const isQuickReplyEnabled = select(
    (state) => state.isNotificationQuickReplyEnabled
  );

  const notification = new Notification({
    id,
    title,
    subtitle,
    body: body ?? '',
    icon: await resolveIcon(icon),
    silent: silent ?? undefined,
    hasReply: canReply && isQuickReplyEnabled,
    actions: actions?.map((action) => ({
      type: 'button',
      text: action.title,
    })),
    ...(requireInteraction !== undefined && { requireInteraction }),
  });

  notification.addListener('show', () => {
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_SHOWN,
      payload: { id },
      ipcMeta,
    });

    const notificationType = notificationTypes.get(id);
    if (notificationType === 'voice') {
      attentionDrawing.drawAttention(id);
    }
  });

  notification.addListener('close', () => {
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_CLOSED,
      payload: { id },
      ipcMeta,
    });
    notifications.delete(id);

    const notificationType = notificationTypes.get(id);
    if (notificationType === 'voice') {
      attentionDrawing.stopAttention(id);
    }
    notificationTypes.delete(id);
    notificationCategories.delete(id);
  });

  notification.addListener('click', () => {
    const serverUrl =
      ipcMeta?.webContentsId !== undefined
        ? getServerUrlByWebContentsId(ipcMeta.webContentsId)
        : undefined;
    const notificationCategory = notificationCategories.get(id);
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_CLICKED,
      payload: {
        id,
        title,
        ...(serverUrl && { serverUrl }),
        ...(notificationCategory && { category: notificationCategory }),
      },
      ipcMeta,
    });
  });

  if (!shouldUseActivationRouting()) {
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
  }

  notifications.set(id, notification);
  if (category) {
    notificationCategories.set(id, category);
  }
  setNotificationRoutingMeta(id, { ipcMeta });

  notification.show();

  return id;
};

const updateNotification = async (
  id: string,
  {
    title,
    body,
    silent,
    renotify: _renotify,
    icon,
    requireInteraction,
    notificationType,
  }: ExtendedNotificationOptions
): Promise<string> => {
  const notification = notifications.get(id);

  if (!notification) {
    return id;
  }

  if (title !== undefined) {
    notification.title = title;
  }

  if (body !== undefined) {
    notification.body = body;
  }

  if (silent !== undefined) {
    notification.silent = silent;
  }

  if (icon !== undefined) {
    const resolvedIcon = await resolveIcon(icon);
    if (resolvedIcon) {
      notification.icon = resolvedIcon;
    }
  }

  if (requireInteraction !== undefined) {
    notification.requireInteraction = requireInteraction;
  }

  let changedToVoice = false;
  if (notificationType !== undefined) {
    const previousType = notificationTypes.get(id);
    notificationTypes.set(id, notificationType);

    if (previousType === 'voice' && notificationType !== 'voice') {
      attentionDrawing.stopAttention(id);
    } else if (previousType !== 'voice' && notificationType === 'voice') {
      changedToVoice = true;
    }
  }

  notification.show();

  if (changedToVoice) {
    attentionDrawing.drawAttention(id);
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
  notificationTypes.set(id, options.notificationType || 'text');
  return createNotification(id, options, ipcMeta);
};

export const handleNotificationActivation = (
  details: Electron.ActivationArguments
): void => {
  const { tag, type } = parseActivationArguments(details.arguments);

  if (!tag) {
    console.warn(
      '[notifications] could not parse notification id from activation arguments'
    );
    return;
  }

  const routingMeta = notificationRoutingMeta.get(tag);
  if (!routingMeta) {
    console.warn(
      `[notifications] no routing metadata found for notification ${tag}`
    );
    return;
  }

  const { ipcMeta } = routingMeta;

  if (type === 'reply' && details.reply !== undefined) {
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id: tag, reply: details.reply },
      ipcMeta,
    });
    return;
  }

  if (type === 'action') {
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_ACTIONED,
      payload: { id: tag, index: details.actionIndex ?? 0 },
      ipcMeta,
    });
  }
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
    const notificationId = String(action.payload.id);
    const notificationType = notificationTypes.get(notificationId);

    notifications.get(notificationId)?.close();

    if (notificationType === 'voice') {
      attentionDrawing.stopAttention(notificationId);
    }
    notificationTypes.delete(notificationId);
    notificationRoutingMeta.delete(notificationId);
  });

  if (shouldUseActivationRouting()) {
    Notification.handleActivation(handleNotificationActivation);
  }
};
