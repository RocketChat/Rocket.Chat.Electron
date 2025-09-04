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

let startRetryCount = 0;
let totalRetryTime = 0;
const MAX_RETRY_TIME = 30000; // Maximum 30 seconds total retry time
const INITIAL_RETRY_DELAY = 1000; // Start with 1 second

// eslint-disable-next-line complexity
const start = async () => {
  console.log('[Rocket.Chat Desktop] Injected.ts start fired');
  if (typeof window.require !== 'function') {
    console.log('[Rocket.Chat Desktop] window.require is not defined');

    if (totalRetryTime >= MAX_RETRY_TIME) {
      console.error(
        `[Rocket.Chat Desktop] Maximum retry time (${MAX_RETRY_TIME}ms) reached. window.require is still not available.`
      );
      console.log(
        '[Rocket.Chat Desktop] Triggering force reload with cache clear to recover...'
      );
      // Trigger force reload with cache clear to recover
      window.RocketChatDesktop.reloadServer();
      return;
    }

    startRetryCount++;
    const retryDelay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(1.5, startRetryCount - 1),
      5000
    ); // Cap at 5 seconds per retry

    // Ensure we don't exceed max total time
    const actualDelay = Math.min(retryDelay, MAX_RETRY_TIME - totalRetryTime);
    totalRetryTime += actualDelay;

    console.log(
      `[Rocket.Chat Desktop] Inject start - retry ${startRetryCount} in ${actualDelay}ms (total time: ${totalRetryTime}ms)`
    );
    setTimeout(start, actualDelay);
    return;
  }

  // Reset retry counters on successful require detection
  startRetryCount = 0;
  totalRetryTime = 0;

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
    // Extract only the core version number (before any suffix like -develop, -rc, etc.)
    const cleanVersion1 = version1.split('-')[0];
    const cleanVersion2 = version2.split('-')[0];

    const v1 = cleanVersion1.split('.').map(Number);
    const v2 = cleanVersion2.split('.').map(Number);

    // Compare each version part
    const maxLength = Math.max(v1.length, v2.length);
    for (let i = 0; i < maxLength; i++) {
      const n1 = v1[i] || 0;
      const n2 = v2[i] || 0;

      if (n1 > n2) {
        return true;
      }
      if (n1 < n2) {
        return false;
      }
    }

    return true; // Equal versions
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

  // Load core modules with individual error handling (non-blocking)
  let Meteor: any = null;
  let Session: any = null;
  let Tracker: any = null;
  let settings: any = null;
  let getUserPreference: any = null;
  let UserPresence: any = null;

  // Load modules asynchronously without blocking
  const loadModule = async (
    modulePath: string,
    moduleName: string,
    setter: (value: any) => void,
    propertyName?: string
  ) => {
    try {
      const module = await tryRequire(modulePath);
      const value = propertyName ? module[propertyName] : module;
      setter(value);
      console.log(
        `[Rocket.Chat Desktop] ${moduleName} module loaded successfully`
      );
    } catch (error) {
      console.log(
        `[Rocket.Chat Desktop] Failed to load ${moduleName} module:`,
        error
      );
    }
  };

  // Start loading all modules in parallel (non-blocking)
  loadModule('meteor/meteor', 'Meteor', (value) => {
    Meteor = value.Meteor;
  });
  loadModule('meteor/session', 'Session', (value) => {
    Session = value.Session;
  });
  loadModule('meteor/tracker', 'Tracker', (value) => {
    Tracker = value.Tracker;
  });
  loadModule(settingsModulePath, 'Settings', (value) => {
    settings = value.settings;
  });
  loadModule(utilsModulePath, 'Utils', (value) => {
    getUserPreference = value.getUserPreference;
  });
  loadModule(userPresenceModulePath, 'UserPresence', (value) => {
    UserPresence = value.UserPresence;
  });

  // Initialize non-module dependent features immediately
  navigator.clipboard.writeText = async (...args) =>
    window.RocketChatDesktop.writeTextToClipboard(...args);

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

  // Track which features have been setup to avoid duplicates
  const setupFlags = {
    urlResolver: false,
    badgeUpdates: false,
    faviconUpdates: false,
    jitsiIntegration: false,
    backgroundSettings: false,
    outlookIntegration: false,
    titleUpdates: false,
    userLoginDetection: false,
    gitCommitHash: false,
    themeAppearance: false,
    userPresence: false,
  };

  // Setup reactive features that depend on modules (with polling)
  // eslint-disable-next-line complexity
  const setupReactiveFeatures = () => {
    if (Meteor?.absoluteUrl && !setupFlags.urlResolver) {
      window.RocketChatDesktop.setUrlResolver(Meteor.absoluteUrl);
      setupFlags.urlResolver = true;
    }

    if (Tracker && Session && !setupFlags.badgeUpdates) {
      Tracker.autorun(() => {
        const unread = Session.get('unread');
        window.RocketChatDesktop.setBadge(unread);
      });
      setupFlags.badgeUpdates = true;
    }

    if (Tracker && settings && !setupFlags.faviconUpdates) {
      Tracker.autorun(() => {
        const { url, defaultUrl } = settings.get('Assets_favicon') || {};
        window.RocketChatDesktop.setFavicon(url || defaultUrl);
      });
      setupFlags.faviconUpdates = true;
    }

    if (Tracker && settings && !setupFlags.jitsiIntegration) {
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
      setupFlags.jitsiIntegration = true;
    }

    if (
      !versionIsGreaterOrEqualsTo(serverInfo.version, '6.4.0') &&
      Tracker &&
      settings &&
      !setupFlags.backgroundSettings
    ) {
      Tracker.autorun(() => {
        const { url, defaultUrl } = settings.get('Assets_background') || {};
        window.RocketChatDesktop.setBackground(url || defaultUrl);
      });
      setupFlags.backgroundSettings = true;
    }

    // Helper function to get Outlook settings based on server version
    const getOutlookSettings = () => {
      if (!Meteor || !settings) return {};
      const userToken = Meteor._localStorage?.getItem('Meteor.loginToken');

      if (!versionIsGreaterOrEqualsTo(serverInfo.version, '7.8.0')) {
        // Pre-7.8.0: Use global server settings
        return {
          userToken,
          userId: Meteor.userId?.(),
          outlookCalendarEnabled: settings.get('Outlook_Calendar_Enabled'),
          outlookExchangeUrl: settings.get('Outlook_Calendar_Exchange_Url'),
        };
      }
      // 7.8.0+: Use user-specific settings
      const user = Meteor.user?.();
      const outlookSettings = user?.settings?.calendar?.outlook;
      return {
        userToken,
        userId: user?._id,
        outlookCalendarEnabled: outlookSettings?.Enabled,
        outlookExchangeUrl: outlookSettings?.Exchange_Url,
      };
    };

    if (Tracker && !setupFlags.outlookIntegration) {
      Tracker.autorun(() => {
        const {
          userToken,
          userId,
          outlookCalendarEnabled,
          outlookExchangeUrl,
        } = getOutlookSettings();

        if (
          !userToken ||
          !userId ||
          !outlookCalendarEnabled ||
          !outlookExchangeUrl
        ) {
          return;
        }

        window.RocketChatDesktop.setUserToken(userToken, userId);
        window.RocketChatDesktop.setOutlookExchangeUrl(
          outlookExchangeUrl,
          userId
        );
      });
      setupFlags.outlookIntegration = true;
    }

    if (Tracker && settings && !setupFlags.titleUpdates) {
      Tracker.autorun(() => {
        const siteName = settings.get('Site_Name');
        window.RocketChatDesktop.setTitle(siteName);
      });
      setupFlags.titleUpdates = true;
    }

    if (Tracker && Meteor && !setupFlags.userLoginDetection) {
      Tracker.autorun(() => {
        const userId = Meteor.userId();
        window.RocketChatDesktop.setUserLoggedIn(userId !== null);
      });
      setupFlags.userLoginDetection = true;
    }

    if (Tracker && Meteor && !setupFlags.gitCommitHash) {
      Tracker.autorun(() => {
        const { gitCommitHash } = Meteor;
        if (!gitCommitHash) return;
        window.RocketChatDesktop.setGitCommitHash(gitCommitHash);
      });
      setupFlags.gitCommitHash = true;
    }

    if (Tracker && Meteor && getUserPreference && !setupFlags.themeAppearance) {
      Tracker.autorun(() => {
        const uid = Meteor.userId();
        if (!uid) return;
        const themeAppearance: string = getUserPreference(
          uid,
          'themeAppearence'
        );
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
      setupFlags.themeAppearance = true;
    }

    if (Tracker && Meteor && getUserPreference && !setupFlags.userPresence) {
      Tracker.autorun(() => {
        const uid = Meteor.userId();
        if (!uid) return;
        const isAutoAwayEnabled: unknown = getUserPreference(
          uid,
          'enableAutoAway'
        );
        const idleThreshold: unknown = getUserPreference(uid, 'idleTimeLimit');

        if (isAutoAwayEnabled && UserPresence) {
          delete UserPresence.awayTime;
          UserPresence.start();
        }

        window.RocketChatDesktop.setUserPresenceDetection({
          isAutoAwayEnabled: Boolean(isAutoAwayEnabled),
          idleThreshold: idleThreshold ? Number(idleThreshold) : null,
          setUserOnline: (online) => {
            if (!online && Meteor.call) {
              Meteor.call('UserPresence:away');
              return;
            }
            if (Meteor.call) {
              Meteor.call('UserPresence:online');
            }
          },
        });
      });
      setupFlags.userPresence = true;
    }
  };

  // Call setupReactiveFeatures immediately and then periodically check for new modules
  setupReactiveFeatures();
  setInterval(setupReactiveFeatures, 1000); // Check every second for newly loaded modules

  console.log('[Rocket.Chat Desktop] Injected');
};

start();
