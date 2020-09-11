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

const notifications = new Map();

class RocketChatNotification extends EventTarget implements Notification {
  static readonly permission: NotificationPermission = 'granted';

  static readonly maxActions: number = process.platform === 'darwin' ? Number.MAX_SAFE_INTEGER : 0;

  static requestPermission(): Promise<NotificationPermission> {
    return Promise.resolve(RocketChatNotification.permission);
  }

  private _destroy: Promise<() => void>;

  constructor(title: string, { icon, ...options }: (NotificationOptions & { canReply?: boolean }) = {}) {
    super();

    for (const eventType of ['show', 'close', 'click', 'reply', 'action']) {
      const propertyName = `on${ eventType }`;
      const propertySymbol = Symbol(propertyName);

      Object.defineProperty(this, propertyName, {
        get: () => this[propertySymbol],
        set: (value) => {
          if (this[propertySymbol]) {
            this.removeEventListener(eventType, this[propertySymbol]);
          }

          this[propertySymbol] = value;

          if (this[propertySymbol]) {
            this.addEventListener(eventType, this[propertySymbol]);
          }
        },
      });
    }

    this._destroy = request<
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
    }).then((id) => {
      notifications.set(id, this);

      return () => {
        dispatch({ type: NOTIFICATIONS_NOTIFICATION_DISMISSED, payload: { id } });
        notifications.delete(id);
      };
    });

    Object.assign(this, { title, icon, ...options });
  }

  actions: NotificationAction[];

  badge: string;

  body: string;

  data: any;

  dir: NotificationDirection;

  icon: string;

  image: string;

  lang: string;

  onclick: (this: Notification, ev: Event) => any;

  onclose: (this: Notification, ev: Event) => any;

  onerror: (this: Notification, ev: Event) => any;

  onshow: (this: Notification, ev: Event) => any;

  renotify: boolean;

  requireInteraction: boolean;

  silent: boolean;

  tag: string;

  timestamp: number;

  title: string;

  vibrate: readonly number[];

  close(): void {
    if (!this._destroy) {
      return;
    }

    this._destroy.then((destroy) => {
      delete this._destroy;
      destroy();
    });
  }
}

const listenToNotificationsRequests = (): void => {
  listen(NOTIFICATIONS_NOTIFICATION_SHOWN, (action) => {
    const { payload: { id } } = action;

    if (!notifications.has(id)) {
      return;
    }

    const showEvent = new CustomEvent('show');
    notifications.get(id).dispatchEvent(showEvent);
  });

  listen(NOTIFICATIONS_NOTIFICATION_CLOSED, (action) => {
    const { payload: { id } } = action;

    if (!notifications.has(id)) {
      return;
    }

    const closeEvent = new CustomEvent('close');
    notifications.get(id).dispatchEvent(closeEvent);
    notifications.delete(id);
  });

  listen(NOTIFICATIONS_NOTIFICATION_CLICKED, (action) => {
    const { payload: { id } } = action;

    if (!notifications.has(id)) {
      return;
    }

    dispatch({
      type: WEBVIEW_FOCUS_REQUESTED,
      payload: {
        url: getServerUrl(),
      },
    });

    const clickEvent = new CustomEvent('click');
    notifications.get(id).dispatchEvent(clickEvent);
  });

  listen(NOTIFICATIONS_NOTIFICATION_REPLIED, (action) => {
    const { payload: { id, reply } } = action;

    if (!notifications.has(id)) {
      return;
    }

    const replyEvent = new CustomEvent<{ reply: string }>('reply', { detail: { reply } });
    notifications.get(id).dispatchEvent(Object.assign(replyEvent, { response: reply }));
  });

  listen(NOTIFICATIONS_NOTIFICATION_ACTIONED, (action) => {
    const { payload: { id, index } } = action;

    if (!notifications.has(id)) {
      return;
    }

    const actionEvent = new CustomEvent<{ index: number }>('action', { detail: { index } });
    notifications.get(id).dispatchEvent(actionEvent);
  });
};

export const createNotificationAPI = (): typeof Notification => {
  listenToNotificationsRequests();

  return RocketChatNotification;
};
