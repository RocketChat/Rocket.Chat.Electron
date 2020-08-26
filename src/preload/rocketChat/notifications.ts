import { takeEvery, Effect, put, call } from 'redux-saga/effects';

import {
  WEBVIEW_FOCUS_REQUESTED,
  NOTIFICATIONS_CREATE_REQUESTED,

  NOTIFICATIONS_NOTIFICATION_ACTIONED,
  NOTIFICATIONS_NOTIFICATION_CLICKED,
  NOTIFICATIONS_NOTIFICATION_CLOSED,
  NOTIFICATIONS_NOTIFICATION_DISMISSED,
  NOTIFICATIONS_NOTIFICATION_REPLIED,
  NOTIFICATIONS_NOTIFICATION_SHOWN,
  NotificationsNotificationShownAction,
  NotificationsNotificationClosedAction,
  NotificationsNotificationClickedAction,
  NotificationsNotificationRepliedAction,
  NotificationsNotificationActionedAction,
} from '../../actions';
import { request } from '../../channels';
import { dispatch } from '../../store';
import { getServerUrl } from './getServerUrl';


const normalizeIconUrl = (iconUrl: string): string => {
  if (/^data:/.test(iconUrl)) {
    return iconUrl;
  }

  if (!/^https?:\/\//.test(iconUrl)) {
    const { Meteor } = window.require('meteor/meteor');
    return Meteor.absoluteUrl(iconUrl);
  }

  return iconUrl;
};

const notifications = new Map();

class CustomNotification extends EventTarget implements Notification {
  static readonly permission: NotificationPermission = 'granted';

  static readonly maxActions: number = process.platform === 'darwin' ? Number.MAX_SAFE_INTEGER : 0;

  static requestPermission(): Promise<NotificationPermission> {
    return Promise.resolve(CustomNotification.permission);
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

    this._destroy = request(NOTIFICATIONS_CREATE_REQUESTED, {
      title,
      ...icon ? {
        icon: normalizeIconUrl(icon),
      } : {},
      ...options,
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

export function *listenToNotificationsRequests(): Generator<Effect> {
  yield call(() => {
    window.Notification = CustomNotification;
  });

  yield takeEvery(NOTIFICATIONS_NOTIFICATION_SHOWN, function *(action: NotificationsNotificationShownAction) {
    const { payload: { id } } = action;

    if (!notifications.has(id)) {
      return;
    }

    const showEvent = new CustomEvent('show');
    notifications.get(id).dispatchEvent(showEvent);
  });

  yield takeEvery(NOTIFICATIONS_NOTIFICATION_CLOSED, function *(action: NotificationsNotificationClosedAction) {
    const { payload: { id } } = action;

    if (!notifications.has(id)) {
      return;
    }

    const closeEvent = new CustomEvent('close');
    notifications.get(id).dispatchEvent(closeEvent);
    notifications.delete(id);
  });

  yield takeEvery(NOTIFICATIONS_NOTIFICATION_CLICKED, function *(action: NotificationsNotificationClickedAction) {
    const { payload: { id } } = action;

    if (!notifications.has(id)) {
      return;
    }

    yield put({
      type: WEBVIEW_FOCUS_REQUESTED,
      payload: {
        url: yield call(getServerUrl),
      },
    });

    const clickEvent = new CustomEvent('click');
    notifications.get(id).dispatchEvent(clickEvent);
  });

  yield takeEvery(NOTIFICATIONS_NOTIFICATION_REPLIED, function *(action: NotificationsNotificationRepliedAction) {
    const { payload: { id, reply } } = action;

    if (!notifications.has(id)) {
      return;
    }

    const replyEvent = new CustomEvent<{ reply: string }>('reply', { detail: { reply } });
    notifications.get(id).dispatchEvent(replyEvent);
  });

  yield takeEvery(NOTIFICATIONS_NOTIFICATION_ACTIONED, function *(action: NotificationsNotificationActionedAction) {
    const { payload: { id, index } } = action;

    if (!notifications.has(id)) {
      return;
    }

    const actionEvent = new CustomEvent<{ index: number }>('action', { detail: { index } });
    notifications.get(id).dispatchEvent(actionEvent);
  });
}
