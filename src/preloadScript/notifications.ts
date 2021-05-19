import {
  NOTIFICATIONS_CREATE_REQUESTED,
  NOTIFICATIONS_CREATE_RESPONDED,
  NOTIFICATIONS_NOTIFICATION_ACTIONED,
  NOTIFICATIONS_NOTIFICATION_CLICKED,
  NOTIFICATIONS_NOTIFICATION_CLOSED,
  NOTIFICATIONS_NOTIFICATION_DISMISSED,
  NOTIFICATIONS_NOTIFICATION_REPLIED,
  NOTIFICATIONS_NOTIFICATION_SHOWN,
} from '../common/actions/notificationsActions';
import * as rootWindowActions from '../common/actions/rootWindowActions';
import * as viewActions from '../common/actions/viewActions';
import { dispatch, listen, request } from '../common/store';
import type { RocketChatDesktopAPI } from '../common/types/RocketChatDesktopAPI';

const eventHandlers = new Map<
  unknown,
  (eventDescriptor: { type: string; detail?: unknown }) => void
>();

export async function createNotification(
  this: RocketChatDesktopAPI,
  {
    title,
    icon,
    onEvent,
    ...options
  }: NotificationOptions & {
    canReply?: boolean;
    title: string;
    onEvent: (eventDescriptor: { type: string; detail: unknown }) => void;
  }
): Promise<unknown> {
  const normalizeIconUrl = (iconUrl: string): string => {
    if (/^data:/.test(iconUrl)) {
      return iconUrl;
    }

    if (!/^https?:\/\//.test(iconUrl)) {
      return this.absoluteUrl(iconUrl);
    }

    return iconUrl;
  };

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
    onEvent({ type: event.type, detail: event.detail })
  );

  return id;
}

export function destroyNotification(id: unknown): void {
  dispatch({ type: NOTIFICATIONS_NOTIFICATION_DISMISSED, payload: { id } });
  eventHandlers.delete(id);
}

export const listenToNotificationsRequests = (
  rocketChatDesktop: RocketChatDesktopAPI
): void => {
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
      payload: { id },
    } = action;

    dispatch(rootWindowActions.focused());
    dispatch(
      viewActions.changed({
        url: rocketChatDesktop.getServerUrl(),
      })
    );

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
