import { getServerUrl, getAbsoluteUrl } from '../servers/preload/urls';
import { dispatch, listen, request } from '../store';
import {
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  WEBVIEW_FOCUS_REQUESTED,
} from '../ui/actions';
import {
  NOTIFICATIONS_CREATE_REQUESTED,
  NOTIFICATIONS_CREATE_RESPONDED,
  NOTIFICATIONS_NOTIFICATION_ACTIONED,
  NOTIFICATIONS_NOTIFICATION_CLICKED,
  NOTIFICATIONS_NOTIFICATION_CLOSED,
  NOTIFICATIONS_NOTIFICATION_DISMISSED,
  NOTIFICATIONS_NOTIFICATION_REPLIED,
  NOTIFICATIONS_NOTIFICATION_SHOWN,
} from './actions';
import type { CustomNotificationOptions } from './common';

const normalizeIconUrl = (iconUrl: string): string => {
  if (/^data:/.test(iconUrl)) {
    return iconUrl;
  }

  if (!/^https?:\/\//.test(iconUrl)) {
    return getAbsoluteUrl(iconUrl);
  }

  return iconUrl;
};

const eventHandlers = new Map<
  unknown,
  (eventDescriptor: { type: string; detail?: unknown }) => void
>();

export const createNotification = async ({
  title,
  icon,
  onEvent,
  ...options
}: NotificationOptions & {
  canReply?: boolean;
  title: string;
  subtitle?: string;
  notificationType?: 'voice' | 'text';
  category?: 'DOWNLOADS' | 'SERVER';
  onEvent?: (eventDescriptor: { type: string; detail: unknown }) => void;
}): Promise<unknown> => {
  const id = await request(
    {
      type: NOTIFICATIONS_CREATE_REQUESTED,
      payload: {
        title,
        ...(icon
          ? {
              icon: normalizeIconUrl(icon),
            }
          : {}),
        ...options,
      },
    },
    NOTIFICATIONS_CREATE_RESPONDED
  );

  eventHandlers.set(id, (event) =>
    onEvent?.({ type: event.type, detail: event.detail })
  );

  return id;
};

export const destroyNotification = (id: unknown): void => {
  dispatch({ type: NOTIFICATIONS_NOTIFICATION_DISMISSED, payload: { id } });
  eventHandlers.delete(id);
};

export const dispatchCustomNotification = async (
  options: CustomNotificationOptions
): Promise<unknown> => {
  const { id, payload, type } = options;
  const notificationId = id || Math.random().toString(36).slice(2);
  return createNotification({
    title: payload.title,
    body: payload.body,
    icon: payload.avatar,
    tag: notificationId,
    requireInteraction: payload.requireInteraction,
    notificationType: type,
  });
};

export const closeCustomNotification = (id: unknown): void => {
  destroyNotification(id);
};

export const listenToNotificationsRequests = (): void => {
  listen(NOTIFICATIONS_NOTIFICATION_SHOWN, (action) => {
    const {
      payload: { id },
    } = action;
    const eventHandler = eventHandlers.get(id);
    eventHandler?.({ type: 'show' });
  });

  listen(NOTIFICATIONS_NOTIFICATION_CLOSED, (action) => {
    const {
      payload: { id },
    } = action;
    const eventHandler = eventHandlers.get(id);
    eventHandler?.({ type: 'close' });
    eventHandlers.delete(id);
  });

  listen(NOTIFICATIONS_NOTIFICATION_CLICKED, (action) => {
    const {
      payload: { id, serverUrl, category },
    } = action;

    if (category === 'DOWNLOADS') {
      dispatch({ type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED });
    } else {
      dispatch({
        type: WEBVIEW_FOCUS_REQUESTED,
        payload: {
          url: serverUrl || getServerUrl(),
          view: 'server',
        },
      });
    }

    const eventHandler = eventHandlers.get(id);
    eventHandler?.({ type: 'click' });
  });

  listen(NOTIFICATIONS_NOTIFICATION_REPLIED, (action) => {
    const {
      payload: { id, reply },
    } = action;
    const eventHandler = eventHandlers.get(id);
    eventHandler?.({ type: 'reply', detail: { reply } });
  });

  listen(NOTIFICATIONS_NOTIFICATION_ACTIONED, (action) => {
    const {
      payload: { id, index },
    } = action;
    const eventHandler = eventHandlers.get(id);
    eventHandler?.({ type: 'action', detail: { index } });
  });
};
