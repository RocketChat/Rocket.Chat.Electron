import { RocketChatDesktopAPI } from './servers/preload/api';

declare global {
  interface Window {
    RocketChatDesktop: RocketChatDesktopAPI;
  }
}

console.log('[Rocket.Chat Desktop] Injected.ts');

const start = (): void => {
  console.log('[Rocket.Chat Desktop] Injected.ts start fired');
  if (typeof window.require !== 'function') {
    console.log('[Rocket.Chat Desktop] window.require is not defined');
    console.log('[Rocket.Chat Desktop] Inject start - retrying in 1 seconds');
    setTimeout(start, 1000);
    return;
  }

  const { Info: serverInfo = {} } =
    window.require('/app/utils/rocketchat.info') ?? {};

  if (!serverInfo.version) {
    console.log('[Rocket.Chat Desktop] serverInfo.version is not defined');
    return;
  }

  console.log('[Rocket.Chat Desktop] Injected.ts serverInfo', serverInfo);

  window.RocketChatDesktop.setServerInfo(serverInfo);

  const { Meteor } = window.require('meteor/meteor');
  const { Session } = window.require('meteor/session');
  const { Tracker } = window.require('meteor/tracker');
  const { UserPresence } = window.require('meteor/konecty:user-presence');
  const { settings } = window.require('/app/settings');
  const { getUserPreference } = window.require('/app/utils');

  window.RocketChatDesktop.setUrlResolver(Meteor.absoluteUrl);

  Tracker.autorun(() => {
    const unread = Session.get('unread');
    window.RocketChatDesktop.setBadge(unread);
  });

  Tracker.autorun(() => {
    const { url, defaultUrl } = settings.get('Assets_favicon') || {};
    window.RocketChatDesktop.setFavicon(url || defaultUrl);
  });

  const open = window.open.bind(window);

  Tracker.autorun(() => {
    const serverMainVersion = serverInfo.version.split('.')[0];

    // Server version above 5.0.0 will change the way the jitsi integration is handled, now we have video provider as an app
    // if the server is above 5.1.1 it will use window.RocketChatDesktop?.openInternalVideoChatWindow to open the video call
    if (serverMainVersion < 5) {
      const jitsiDomain = settings.get('Jitsi_Domain') || '';

      console.log(
        '[Rocket.Chat Desktop] window.open for Jitsi overloaded',
        jitsiDomain
      );
      window.open = (url, name, features = '') => {
        if (
          !process.mas &&
          window.RocketChatDesktop.getInternalVideoChatWindowEnabled() &&
          typeof url === 'string' &&
          jitsiDomain.length > 0 &&
          url.includes(jitsiDomain)
        ) {
          return open(url, 'Video Call', `scrollbars=true,${features}`);
        }

        return open(url, name, features);
      };
    }
  });

  Tracker.autorun(() => {
    const { url, defaultUrl } = settings.get('Assets_background') || {};

    window.RocketChatDesktop.setBackground(url || defaultUrl);
  });

  Tracker.autorun(() => {
    const siteName = settings.get('Site_Name');
    window.RocketChatDesktop.setTitle(siteName);
  });

  Tracker.autorun(() => {
    const userId = Meteor.userId();
    window.RocketChatDesktop.setUserLoggedIn(userId !== null);
  });

  Tracker.autorun(() => {
    const { gitCommitHash } = Meteor;
    if (!gitCommitHash) return;
    window.RocketChatDesktop.setGitCommitHash(gitCommitHash);
  });

  Tracker.autorun(() => {
    const uid = Meteor.userId();
    if (!uid) return;
    const isAutoAwayEnabled: unknown = getUserPreference(uid, 'enableAutoAway');
    const idleThreshold: unknown = getUserPreference(uid, 'idleTimeLimit');

    if (isAutoAwayEnabled) {
      delete UserPresence.awayTime;
      UserPresence.start();
    }

    window.RocketChatDesktop.setUserPresenceDetection({
      isAutoAwayEnabled: Boolean(isAutoAwayEnabled),
      idleThreshold: idleThreshold ? Number(idleThreshold) : null,
      setUserOnline: (online) => {
        if (!online) {
          Meteor.call('UserPresence:away');
          return;
        }
        Meteor.call('UserPresence:online');
      },
    });
  });

  const destroyPromiseSymbol = Symbol('destroyPromise');

  console.log('[Rocket.Chat Desktop] Injected.ts replaced Notification');

  window.Notification = class RocketChatDesktopNotification
    extends EventTarget
    implements Notification
  {
    static readonly permission: NotificationPermission = 'granted';

    static readonly maxActions: number =
      process.platform === 'darwin' ? Number.MAX_SAFE_INTEGER : 0;

    static requestPermission(): Promise<NotificationPermission> {
      return Promise.resolve(RocketChatDesktopNotification.permission);
    }

    [destroyPromiseSymbol]?: Promise<() => void>;

    constructor(
      title: string,
      options: NotificationOptions & { canReply?: boolean } = {}
    ) {
      super();

      for (const eventType of ['show', 'close', 'click', 'reply', 'action']) {
        const propertyName = `on${eventType}`;
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

      this[destroyPromiseSymbol] = window.RocketChatDesktop.createNotification({
        title,
        ...options,
        onEvent: this.handleEvent,
      }).then((id) => () => {
        window.RocketChatDesktop.destroyNotification(id);
      });

      Object.assign(this, { title, ...options });
    }

    actions: readonly NotificationAction[] = [];

    badge = '';

    body = '';

    data: any = undefined;

    dir: NotificationDirection = 'auto';

    icon = '';

    image = '';

    lang = document.documentElement.lang;

    onclick: ((this: Notification, ev: Event) => any) | null = null;

    onclose: ((this: Notification, ev: Event) => any) | null = null;

    onerror: ((this: Notification, ev: Event) => any) | null = null;

    onshow: ((this: Notification, ev: Event) => any) | null = null;

    renotify = false;

    requireInteraction = false;

    silent = false;

    tag = '';

    timestamp: number = Date.now();

    title = '';

    vibrate: readonly number[] = [];

    private handleEvent = ({
      type,
      detail,
    }: {
      type: string;
      detail: unknown;
    }): void => {
      const mainWorldEvent = new CustomEvent(type, { detail });

      const isReplyEvent = (
        type: string,
        detail: unknown
      ): detail is { reply: string } =>
        type === 'reply' &&
        typeof detail === 'object' &&
        detail !== null &&
        'reply' in detail &&
        typeof (detail as { reply: string }).reply === 'string';

      if (isReplyEvent(type, detail)) {
        (mainWorldEvent as any).response = detail.reply;
      }
      this.dispatchEvent(mainWorldEvent);
    };

    close(): void {
      if (!this[destroyPromiseSymbol]) {
        return;
      }

      this[destroyPromiseSymbol]?.then((destroy) => {
        delete this[destroyPromiseSymbol];
        destroy();
      });
    }
  };
};

console.log('[Rocket.Chat Desktop] Injected');

start();
