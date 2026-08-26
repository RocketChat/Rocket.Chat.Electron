import type { NativeImage } from 'electron';
import { Notification, nativeImage } from 'electron';

import { invoke } from '../ipc/main';
import { loggers } from '../logging/scopes';
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
  category?: 'DOWNLOADS' | 'SERVER';
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
// Windows only: instances whose banner already closed but whose Action Center
// card may still be showing, so an explicit dismissal can still remove it.
const closedNotifications = new Map<string, Electron.Notification>();
const notificationTypes = new Map<string, 'voice' | 'text'>();
const notificationCategories = new Map<string, 'DOWNLOADS' | 'SERVER'>();
const notificationRoutingMeta = new Map<string, NotificationRoutingMeta>();
// Electron can fire a Windows toast's `reply` event twice for one submission;
// gate on this until the next `show` resets it (SUP-1097 forward-port, #3467).
const repliedNotifications = new Set<string>();

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
    repliedNotifications.delete(id);

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

    const notification = notifications.get(id);
    notifications.delete(id);

    // On Windows a toast that times out raises `close` while its Action Center
    // card stays visible and still accepts quick replies. Keep the instance
    // reachable so an explicit dismissal can actually remove that card, but
    // out of `notifications` so a later create with the same tag still builds a
    // fresh notification instead of taking the update path.
    if (shouldUseActivationRouting() && notification) {
      closedNotifications.set(id, notification);

      if (closedNotifications.size > MAX_ROUTING_ENTRIES) {
        const oldestId = closedNotifications.keys().next().value;
        if (oldestId !== undefined) {
          closedNotifications.delete(oldestId);
        }
      }
    }

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
    const notificationCategory =
      notificationCategories.get(id) ??
      notificationRoutingMeta.get(id)?.category;
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
      if (repliedNotifications.has(id)) {
        return;
      }
      repliedNotifications.add(id);

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
  setNotificationRoutingMeta(id, { ipcMeta, category });

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
    loggers.notifications.warn(
      'could not parse notification id from activation arguments',
      details.arguments
    );
    return;
  }

  // An Action Center card outlives its banner and the app-side `close()`, so a
  // reply can arrive after the routing metadata was evicted (LRU overflow, or
  // the web client's auto-close timer). Losing the metadata only costs us the
  // target webContents, so fall back to a broadcast: both renderer handlers key
  // off the notification id, and only the view that created it has an entry.
  const routingMeta = notificationRoutingMeta.get(tag);
  if (!routingMeta) {
    loggers.notifications.warn(
      `no routing metadata for notification ${tag}; broadcasting activation`
    );
  }

  const ipcMeta = routingMeta?.ipcMeta;

  const dispatchActivation = <Action extends Parameters<typeof dispatch>[0]>(
    action: Action
  ): void => {
    if (ipcMeta) {
      dispatchSingle({ ...action, ipcMeta });
      return;
    }
    dispatch(action);
  };

  if (type === 'reply' && details.reply !== undefined) {
    if (repliedNotifications.has(tag)) {
      return;
    }
    repliedNotifications.add(tag);

    dispatchActivation({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id: tag, reply: details.reply },
    });
    return;
  }

  if (type === 'action') {
    dispatchActivation({
      type: NOTIFICATIONS_NOTIFICATION_ACTIONED,
      payload: { id: tag, index: details.actionIndex ?? 0 },
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

    // The banner may already have timed out, which removes the instance from
    // `notifications` but leaves the Action Center card in place; fall back to
    // the closed instance so this dismissal actually removes that card.
    (
      notifications.get(notificationId) ??
      closedNotifications.get(notificationId)
    )?.close();
    closedNotifications.delete(notificationId);

    if (notificationType === 'voice') {
      attentionDrawing.stopAttention(notificationId);
    }
    notificationTypes.delete(notificationId);

    // Keep the routing metadata on Windows: the web client auto-closes every
    // notification a few seconds after showing it, yet its Action Center card
    // stays repliable, so dropping the metadata here is what silently lost
    // late replies. The bounded LRU in setNotificationRoutingMeta reclaims it.
    if (!shouldUseActivationRouting()) {
      notificationRoutingMeta.delete(notificationId);
    }
  });

  if (shouldUseActivationRouting()) {
    Notification.handleActivation(handleNotificationActivation);
  }
};
