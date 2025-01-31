import type { NotificationAction } from 'electron';

import type { RocketChatDesktopAPI } from './servers/preload/api';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    RocketChatDesktop: RocketChatDesktopAPI;
  }
}

console.log('[Rocket.Chat Desktop] Injected.ts');

const resolveWithExponentialBackoff = <T>(
  fn: () => Promise<T>,
  { maxRetries = 5, delay = 1000 } = {}
) =>
  new Promise<T>((resolve) => resolve(fn())).catch((error) => {
    if (maxRetries === 0) {
      throw error;
    }
    console.log(
      '[Rocket.Chat Desktop] Inject resolveWithExponentialBackoff - retrying in 1 seconds'
    );
    return new Promise<T>((resolve) => {
      setTimeout(() => {
        resolve(
          resolveWithExponentialBackoff(fn, {
            maxRetries: maxRetries - 1,
            delay: delay * 2,
          })
        );
      }, delay);
    });
  });

const tryRequire = <T = any>(path: string) =>
  resolveWithExponentialBackoff<T>(() => window.require(path));

const start = async () => {
  console.log('[Rocket.Chat Desktop] Injected.ts start fired');
  if (typeof window.require !== 'function') {
    console.log('[Rocket.Chat Desktop] window.require is not defined');
    console.log('[Rocket.Chat Desktop] Inject start - retrying in 1 seconds');
    setTimeout(start, 1000);
    return;
  }

  const { Info: serverInfo = {} } = await tryRequire(
    '/app/utils/rocketchat.info'
  );

  if (!serverInfo.version) {
    console.log('[Rocket.Chat Desktop] serverInfo.version is not defined');
    return;
  }

  console.log('[Rocket.Chat Desktop] Injected.ts serverInfo', serverInfo);

  window.RocketChatDesktop.setServerInfo(serverInfo);

  function versionIsGreaterOrEqualsTo(
    version1: string,
    version2: string
  ): boolean {
    const v1 = version1.match(/\d+/g)?.map(Number) || [];
    const v2 = version2.match(/\d+/g)?.map(Number) || [];

    for (let i = 0; i < 3; i++) {
      const n1 = v1[i] || 0;
      const n2 = v2[i] || 0;

      if (n1 > n2) {
        return true;
      }
      if (n1 < n2) {
        return false;
      }
    }

    return true;
  }

  const userPresenceModulePath = versionIsGreaterOrEqualsTo(
    serverInfo.version,
    '6.3.0'
  )
    ? 'meteor/rocketchat:user-presence'
    : 'meteor/konecty:user-presence';

  const settingsModulePath = (() => {
    // if (versionIsGreaterOrEqualsTo(serverInfo.version, '6.0.0'))
    //   return '/app/settings/client';
    if (versionIsGreaterOrEqualsTo(serverInfo.version, '5.0.0'))
      return '/app/settings/client/index.ts';
    return '/app/settings';
  })();

  const utilsModulePath = (() => {
    // if (versionIsGreaterOrEqualsTo(serverInfo.version, '6.0.0'))
    //   return '/app/utils/client';
    if (versionIsGreaterOrEqualsTo(serverInfo.version, '5.0.0'))
      return '/app/utils/client/index.ts';
    return '/app/utils';
  })();

  const { Meteor } = await tryRequire('meteor/meteor');
  const { Session } = await tryRequire('meteor/session');
  const { Tracker } = await tryRequire('meteor/tracker');
  const { UserPresence } = await tryRequire(userPresenceModulePath);
  const { settings } = await tryRequire(settingsModulePath);
  const { getUserPreference } = await tryRequire(utilsModulePath);

  window.RocketChatDesktop.setUrlResolver(Meteor.absoluteUrl);

  navigator.clipboard.writeText = async (...args) =>
    window.RocketChatDesktop.writeTextToClipboard(...args);

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
          console.log('[Rocket.Chat Desktop] window.open for Jitsi fired');
          return open(url, 'Video Call', `scrollbars=true,${features}`);
        }

        return open(url, name, features);
      };
    }
  });

  if (!versionIsGreaterOrEqualsTo(serverInfo.version, '6.4.0')) {
    Tracker.autorun(() => {
      const { url, defaultUrl } = settings.get('Assets_background') || {};
      window.RocketChatDesktop.setBackground(url || defaultUrl);
    });
  }

  Tracker.autorun(() => {
    const userToken = Meteor._localStorage.getItem('Meteor.loginToken');
    const userId = Meteor.userId();
    const outlookCalendarEnabled = settings.get('Outlook_Calendar_Enabled');
    const outlookExchangeUrl = settings.get('Outlook_Calendar_Exchange_Url');
    if (!userToken || !userId || !outlookCalendarEnabled || !outlookExchangeUrl)
      return;
    window.RocketChatDesktop.setUserToken(userToken, userId);

    window.RocketChatDesktop.setOutlookExchangeUrl(outlookExchangeUrl, userId);
  });

  Tracker.autorun(() => {
    const userToken = Meteor._localStorage.getItem('Meteor.loginToken');
    const userId = Meteor.userId();
    const outlookCalendarEnabled = settings.get('Outlook_Calendar_Enabled');
    const outlookExchangeUrl = settings.get('Outlook_Calendar_Exchange_Url');
    if (!userToken || !userId || !outlookCalendarEnabled || !outlookExchangeUrl)
      return;
    window.RocketChatDesktop.setUserToken(userToken, userId);

    window.RocketChatDesktop.setOutlookExchangeUrl(outlookExchangeUrl, userId);
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
    const themeAppearance: string = getUserPreference(uid, 'themeAppearence');
    if (
      ['dark', 'light', 'auto', 'high-contrast'].includes(
        themeAppearance as any
      )
    ) {
      window.RocketChatDesktop.setUserThemeAppearance(
        themeAppearance as 'auto' | 'dark' | 'light' | 'high-contrast'
      );
    }
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

    #destroy?: Promise<() => void>;

    constructor(
      title: string,
      options: NotificationOptions & { canReply?: boolean } = {}
    ) {
      super();

      this.#destroy = window.RocketChatDesktop.createNotification({
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

    #onclick: ((this: Notification, ev: Event) => any) | null = null;

    get onclick() {
      return this.#onclick;
    }

    set onclick(value) {
      if (this.#onclick) {
        this.removeEventListener('click', this.#onclick);
      }

      this.#onclick = value;

      if (this.#onclick) {
        this.addEventListener('click', this.#onclick);
      }
    }

    #onclose: ((this: Notification, ev: Event) => any) | null = null;

    get onclose() {
      return this.#onclose;
    }

    set onclose(value) {
      if (this.#onclose) {
        this.removeEventListener('close', this.#onclose);
      }

      this.#onclose = value;

      if (this.#onclose) {
        this.addEventListener('close', this.#onclose);
      }
    }

    #onerror: ((this: Notification, ev: Event) => any) | null = null;

    get onerror() {
      return this.#onerror;
    }

    set onerror(value) {
      if (this.#onerror) {
        this.removeEventListener('error', this.#onerror);
      }

      this.#onerror = value;

      if (this.#onerror) {
        this.addEventListener('error', this.#onerror);
      }
    }

    #onshow: ((this: Notification, ev: Event) => any) | null = null;

    get onshow() {
      return this.#onshow;
    }

    set onshow(value) {
      if (this.#onshow) {
        this.removeEventListener('show', this.#onshow);
      }

      this.#onshow = value;

      if (this.#onshow) {
        this.addEventListener('show', this.#onshow);
      }
    }

    #onaction: ((this: Notification, ev: Event) => any) | null = null;

    get onaction() {
      return this.#onaction;
    }

    set onaction(value) {
      if (this.#onaction) {
        this.removeEventListener('action', this.#onaction);
      }

      this.#onaction = value;

      if (this.#onaction) {
        this.addEventListener('action', this.#onaction);
      }
    }

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
      if (!this.#destroy) {
        return;
      }

      this.#destroy?.then((destroy) => {
        this.#destroy = undefined;
        destroy();
      });
    }
  };

  console.log('[Rocket.Chat Desktop] Injected');
};

start();
