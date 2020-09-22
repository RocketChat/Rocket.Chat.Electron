import { getServerUrl, getAbsoluteUrl } from '../servers/preload/urls';
import { dispatch, listen, request } from '../store';
import { WEBVIEW_FOCUS_REQUESTED } from '../ui/actions';
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

const normalizeIconUrl = (iconUrl: string): string => {
  if (/^data:/.test(iconUrl)) {
    return iconUrl;
  }

  if (!/^https?:\/\//.test(iconUrl)) {
    return getAbsoluteUrl(iconUrl);
  }

  return iconUrl;
};

const eventHandlers = new Map<unknown, (eventDescriptor: { type: string; detail?: unknown }) => void>();

export const createNotification = async ({
  title,
  icon,
  onEvent,
  ...options
}: NotificationOptions & {
  canReply?: boolean,
  title: string,
  onEvent: (eventDescriptor: { type: string; detail?: unknown }) => void,
}): Promise<unknown> => {
  const id = await request<
    typeof NOTIFICATIONS_CREATE_REQUESTED,
    typeof NOTIFICATIONS_CREATE_RESPONDED
  >({
    type: NOTIFICATIONS_CREATE_REQUESTED,
    payload: {
      title,
      ...icon ? {
        icon: normalizeIconUrl(icon),
      } : {},
      ...options,
    },
  });

  eventHandlers.set(id, (event) => onEvent({ type: event.type, detail: event.detail }));

  return id;
};

export const destroyNotification = (id: unknown): void => {
  dispatch({ type: NOTIFICATIONS_NOTIFICATION_DISMISSED, payload: { id } });
  eventHandlers.delete(id);
};

export const listenToNotificationsRequests = (): void => {
  listen(NOTIFICATIONS_NOTIFICATION_SHOWN, (action) => {
    const { payload: { id } } = action;

    if (!eventHandlers.has(id)) {
      return;
    }

    eventHandlers.get(id)({ type: 'show' });
  });

  listen(NOTIFICATIONS_NOTIFICATION_CLOSED, (action) => {
    const { payload: { id } } = action;

    if (!eventHandlers.has(id)) {
      return;
    }

    eventHandlers.get(id)({ type: 'close' });
    eventHandlers.delete(id);
  });

  listen(NOTIFICATIONS_NOTIFICATION_CLICKED, (action) => {
    const { payload: { id } } = action;

    if (!eventHandlers.has(id)) {
      return;
    }

    dispatch({
      type: WEBVIEW_FOCUS_REQUESTED,
      payload: {
        url: getServerUrl(),
      },
    });

    eventHandlers.get(id)({ type: 'click' });
  });

  listen(NOTIFICATIONS_NOTIFICATION_REPLIED, (action) => {
    const { payload: { id, reply } } = action;

    if (!eventHandlers.has(id)) {
      return;
    }

    eventHandlers.get(id)({ type: 'reply', detail: { reply } });
  });

  listen(NOTIFICATIONS_NOTIFICATION_ACTIONED, (action) => {
    const { payload: { id, index } } = action;

    if (!eventHandlers.has(id)) {
      return;
    }

    eventHandlers.get(id)({ type: 'action', detail: { index } });
  });
};
