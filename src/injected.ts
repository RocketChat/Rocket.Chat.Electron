import type { NotificationAction } from 'electron';

import { createPresenceRateLimiter } from './servers/preload/presenceDebounce';
import type { PresenceStoreEntry } from './servers/preload/presenceSnapshot';
import { buildPresenceSnapshot } from './servers/preload/presenceSnapshot';
import { hasUsablePresenceApi } from './servers/preload/presenceSupport';

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

// Some webapp modules are reachable under more than one specifier depending on
// the Rocket.Chat version, and there is no registry we can enumerate. Probing
// each candidate with `tryRequire` in turn would multiply the exponential
// backoff per candidate, so the whole candidate list is probed in a single
// synchronous pass and it is that pass which gets retried with backoff.
const tryRequireFirstOf = <T = any>(paths: string[]) =>
  resolveWithExponentialBackoff<T>(async () => {
    for (const path of paths) {
      try {
        const module = window.require(path);
        if (module) {
          return module as T;
        }
      } catch (error) {
        // Wrong specifier for this server version; try the next candidate.
      }
    }
    throw new Error(`None of the module paths resolved: ${paths.join(', ')}`);
  });

const BOOT_RECOVERY_ATTEMPTS_KEY = 'rocketChatDesktopBootRecoveryAttempts';
const MAX_BOOT_RECOVERY_ATTEMPTS = 2;

const getBootRecoveryAttempts = (): number => {
  try {
    return (
      Number(window.sessionStorage.getItem(BOOT_RECOVERY_ATTEMPTS_KEY)) || 0
    );
  } catch (error) {
    return 0;
  }
};

// Reloading in place never recovers a wedged webview (stale service worker or
// cache keeps serving a broken bundle), so recovery goes through
// reloadServer(), which clears the service worker and cache storage before
// reloading. The sessionStorage counter survives those reloads and caps the
// attempts, so a genuinely broken server degrades instead of reload-looping.
const attemptBootRecovery = (reason: string): void => {
  const attempts = getBootRecoveryAttempts();

  if (attempts >= MAX_BOOT_RECOVERY_ATTEMPTS) {
    console.error(
      `[Rocket.Chat Desktop] ${reason}. Boot recovery attempts exhausted (${attempts}); giving up. Restart the app or use "Reload Clearing Cache" to retry.`
    );
    return;
  }

  try {
    window.sessionStorage.setItem(
      BOOT_RECOVERY_ATTEMPTS_KEY,
      String(attempts + 1)
    );
  } catch (error) {
    // Without a persisted counter every reload would read zero attempts and
    // recover again, forever — safer to not recover at all.
    console.error(
      `[Rocket.Chat Desktop] ${reason}. Boot recovery is disabled because sessionStorage is unavailable.`
    );
    return;
  }

  console.error(
    `[Rocket.Chat Desktop] ${reason}. Triggering force reload with cache clear to recover (attempt ${
      attempts + 1
    } of ${MAX_BOOT_RECOVERY_ATTEMPTS})...`
  );
  window.RocketChatDesktop.reloadServer();
};

const resetBootRecovery = (): void => {
  try {
    window.sessionStorage.removeItem(BOOT_RECOVERY_ATTEMPTS_KEY);
  } catch (error) {
    // sessionStorage unavailable; nothing to reset
  }
};

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
      attemptBootRecovery(
        `Maximum retry time (${MAX_RETRY_TIME}ms) reached. window.require is still not available`
      );
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
    setTimeout(() => {
      start().catch((error) => {
        console.error(
          '[Rocket.Chat Desktop] Injected.ts failed to start:',
          error
        );
      });
    }, actualDelay);
    return;
  }

  // Reset retry counters on successful require detection
  startRetryCount = 0;
  totalRetryTime = 0;

  let serverInfo: any = {};
  try {
    ({ Info: serverInfo = {} } = await tryRequire(
      '/app/utils/rocketchat.info'
    ));
  } catch (error) {
    // window.require exists but the module registry is incomplete — the
    // webapp boot is wedged (stuck throbber) and only a cache-clearing
    // reload recovers it.
    attemptBootRecovery(
      "Failed to require '/app/utils/rocketchat.info' after retries"
    );
    return;
  }

  if (!serverInfo.version) {
    attemptBootRecovery(
      "Required '/app/utils/rocketchat.info' returned no server version"
    );
    return;
  }

  resetBootRecovery();

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

  // The webapp's presence store (`apps/meteor/client/lib/presence.ts`) is the
  // ONLY source of a user's presence: it is fed by the `stream-user-presence`
  // DDP stream and is deliberately not published into the `Meteor.users`
  // minimongo collection. The exact `window.require` specifier is not stable
  // across Rocket.Chat versions and could not be confirmed at runtime, so a
  // short candidate list is probed and the first hit wins. All misses are a
  // supported outcome: presence is reported as unsupported and hidden.
  // `/client/lib/presence.ts` is the specifier confirmed against a live
  // Rocket.Chat 8.8 workspace — the extension is required there, and the
  // extensionless form fails with "Cannot find module". The others are
  // fallbacks for versions that resolve it differently.
  const presenceModulePaths = [
    '/client/lib/presence.ts',
    '/client/lib/presence',
    'client/lib/presence',
  ];

  // Load core modules with individual error handling (non-blocking)
  let Meteor: any = null;
  let Session: any = null;
  let Tracker: any = null;
  let settings: any = null;
  let getUserPreference: any = null;
  let UserPresence: any = null;
  let Presence: any = null;
  // Distinguishes "still loading" (null) from "this workspace does not expose
  // the presence module" (false), so the tray can degrade to hiding presence
  // instead of showing a permanently blank state.
  let presenceModuleResolved: boolean | null = null;

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

  tryRequireFirstOf(presenceModulePaths)
    .then((module) => {
      if (!hasUsablePresenceApi(module)) {
        console.warn(
          '[Rocket.Chat Desktop] Presence module resolved without the expected store/listen API; presence will be reported as unsupported'
        );
        presenceModuleResolved = false;
        return;
      }
      Presence = (module as { Presence: unknown }).Presence;
      presenceModuleResolved = true;
      console.log('[Rocket.Chat Desktop] Presence module loaded successfully');
    })
    .catch(() => {
      console.warn(
        `[Rocket.Chat Desktop] Failed to load the presence module (tried: ${presenceModulePaths.join(
          ', '
        )}); presence will be reported as unsupported`
      );
      presenceModuleResolved = false;
    });

  // Initialize non-module dependent features immediately
  // navigator.clipboard is undefined outside secure contexts (plain HTTP
  // workspaces), so guard the patch or the whole start() chain throws here
  // and never reaches the Notification shim below.
  if (navigator.clipboard) {
    navigator.clipboard.writeText = async (...args) =>
      window.RocketChatDesktop.writeTextToClipboard(...args);
  }

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
    unreadChangedEvent: false,
    faviconUpdates: false,
    jitsiIntegration: false,
    backgroundSettings: false,
    outlookIntegration: false,
    titleUpdates: false,
    userLoginDetection: false,
    gitCommitHash: false,
    themeAppearance: false,
    userPresence: false,
    userPresenceStatus: false,
  };

  // Per-subscription unread state, accumulated from the
  // `unread-changed-by-subscription` global event so the badge can reproduce
  // the server's alert-only "•" indicator. Lives outside setupReactiveFeatures
  // so it survives the periodic re-invocation below.
  const unreadSubscriptions = new Map<
    string,
    { unread: number; alert?: boolean; unreadAlert?: string }
  >();

  // Setup reactive features that depend on modules (with polling)
  // eslint-disable-next-line complexity
  const setupReactiveFeatures = () => {
    if (Meteor?.absoluteUrl && !setupFlags.urlResolver) {
      window.RocketChatDesktop.setUrlResolver(Meteor.absoluteUrl);
      setupFlags.urlResolver = true;
    }

    // Pre-7.8.0 only: those servers still publish the badge through the Meteor
    // Session reactive dict. On 7.8.0+ this key is gone (Session.get('unread')
    // resolves to undefined) and the global-event path below owns the badge, so
    // running this autorun there would clear the badge with setBadge(undefined).
    if (
      !versionIsGreaterOrEqualsTo(serverInfo.version, '7.8.0') &&
      Tracker &&
      Session &&
      !setupFlags.badgeUpdates
    ) {
      Tracker.autorun(() => {
        const unread = Session.get('unread');
        window.RocketChatDesktop.setBadge(unread);
      });
      setupFlags.badgeUpdates = true;
    }

    // Servers >= 7.x removed `unread` from the Meteor Session reactive dict
    // (RocketChat/Rocket.Chat#36001), which is why the Session autorun above is
    // gated to pre-7.8.0. Those servers no longer expose the badge through
    // Meteor at all, but they still broadcast it through two global
    // CustomEvents on window, mirroring the server's own `useUnread` hook:
    //   - `unread-changed-by-subscription`: fires per subscription whenever its
    //     unread-relevant fields change, carrying { rid, unread, alert,
    //     unreadAlert }. We accumulate these into `unreadSubscriptions` to
    //     rebuild the alert-only "•" indicator that the numeric count alone
    //     cannot represent.
    //   - `unread-changed`: fires on every recompute with the aggregate count.
    //     We use it as the recompute trigger and the source of truth for the
    //     numeric total.
    // The badge value is resolved exactly as the server's `useUnread` does:
    // a positive count wins, otherwise an alert-only "•", otherwise no badge.
    // Registered independently of the Meteor modules so it works even when they
    // never load.
    if (!setupFlags.unreadChangedEvent) {
      // `aggregateCount`, when provided, is the authoritative total carried by
      // the `unread-changed` event. The per-subscription map is incremental and
      // only sees rooms that changed after the listener attached, so it can
      // undercount; we prefer the aggregate for the numeric total and use the
      // map solely to rebuild the alert-only "•" indicator.
      // Server boot floods this path: the webapp fires one
      // `unread-changed-by-subscription` event per room when it starts, and
      // dispatching a badge update for each one storms the root window's
      // Redux store hard enough that React aborts with "Maximum update depth
      // exceeded". Recomputes are therefore coalesced into a single
      // trailing-edge call, and the dispatch is skipped entirely when the
      // resolved badge value did not change.
      const BADGE_COALESCE_MS = 100;
      let resolveBadgeTimer: ReturnType<typeof setTimeout> | null = null;
      let pendingAggregateCount: number | undefined;
      let lastSentBadge: number | '•' | undefined;
      let hasSentBadge = false;

      const resolveBadge = (aggregateCount?: number): void => {
        let unreadCount = 0;
        let alertIndicator: '•' | undefined;

        // The user's `unreadAlert` preference only influences rooms left on the
        // default. No global event carries it, so we read it from the Meteor
        // user document when available and fall back to the server's shipped
        // default of `true`.
        const unreadAlertEnabled =
          Meteor?.user?.()?.settings?.preferences?.unreadAlert ?? true;

        for (const subscription of unreadSubscriptions.values()) {
          const { unread, alert, unreadAlert } = subscription;
          if (alert || unread > 0) {
            if (
              alert === true &&
              unreadAlert !== 'nothing' &&
              (unreadAlert === 'all' || unreadAlertEnabled !== false)
            ) {
              alertIndicator = '•';
            }
            unreadCount += unread;
          }
        }

        const total =
          aggregateCount !== undefined && aggregateCount > unreadCount
            ? aggregateCount
            : unreadCount;

        const badge = total > 0 ? total : alertIndicator ?? 0;
        if (hasSentBadge && badge === lastSentBadge) {
          return;
        }
        hasSentBadge = true;
        lastSentBadge = badge;
        window.RocketChatDesktop.setBadge(badge);
      };

      const scheduleResolveBadge = (aggregateCount?: number): void => {
        if (aggregateCount !== undefined) {
          pendingAggregateCount = aggregateCount;
        }
        if (resolveBadgeTimer !== null) {
          return;
        }
        resolveBadgeTimer = setTimeout(() => {
          resolveBadgeTimer = null;
          const aggregate = pendingAggregateCount;
          pendingAggregateCount = undefined;
          resolveBadge(aggregate);
        }, BADGE_COALESCE_MS);
      };

      window.addEventListener('unread-changed-by-subscription', (event) => {
        const subscription = (
          event as CustomEvent<{
            rid?: string;
            unread?: number;
            alert?: boolean;
            unreadAlert?: string;
          }>
        ).detail;
        if (!subscription?.rid) {
          return;
        }
        unreadSubscriptions.set(subscription.rid, {
          unread: subscription.unread ?? 0,
          alert: subscription.alert,
          unreadAlert: subscription.unreadAlert,
        });
        scheduleResolveBadge();
      });

      window.addEventListener('unread-changed', (event) => {
        const { detail } = event as CustomEvent<number | undefined>;
        const aggregateCount =
          typeof detail === 'number' && Number.isFinite(detail)
            ? detail
            : undefined;
        scheduleResolveBadge(aggregateCount);
      });

      setupFlags.unreadChangedEvent = true;
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

    if (
      Tracker &&
      Meteor &&
      presenceModuleResolved !== null &&
      !setupFlags.userPresenceStatus
    ) {
      // Presence and the custom status message both come from the webapp's
      // presence store, which is fed by the `stream-user-presence` DDP stream.
      // `Presence.listen` is an Emitter subscription, NOT a Tracker reactive
      // dependency, so it cannot live inside the autorun below — it is
      // subscribed once per uid outside it. Only `Meteor.userId()` and
      // `Meteor.status()` are genuinely reactive.
      const presenceSupported = presenceModuleResolved === true;

      let currentUid: string | null = null;
      let latestStoreEntry: PresenceStoreEntry | null = null;
      let latestConnectionStatus: string | undefined;

      const pushPresence = (): void => {
        window.RocketChatDesktop.setUserPresence(
          buildPresenceSnapshot({
            storeEntry: latestStoreEntry,
            connectionStatus: latestConnectionStatus,
            supported: presenceSupported,
          })
        );
      };

      const handlePresenceUpdate = (entry?: PresenceStoreEntry): void => {
        latestStoreEntry = entry ?? null;
        pushPresence();
      };

      // `listen` only fires on subsequent stream updates, so the current value
      // is seeded from the store; `stop` on uid change keeps handlers from
      // accumulating across account switches.
      const subscribeToPresence = (uid: string | null): void => {
        if (uid === currentUid) return;

        if (currentUid && Presence) {
          try {
            Presence.stop(currentUid, handlePresenceUpdate);
          } catch (error) {
            console.warn(
              '[Rocket.Chat Desktop] Failed to unsubscribe from presence updates',
              error
            );
          }
        }

        currentUid = uid;
        latestStoreEntry = null;

        if (!uid || !Presence) return;

        try {
          Presence.listen(uid, handlePresenceUpdate);

          // The store is populated lazily: it stays empty until something
          // asks for a uid, so reading `store.get` here returns nothing on a
          // fresh session and `listen` alone never backfills it. `get`
          // resolves the current presence and registers the subscription that
          // keeps it up to date, so it is what seeds the first value.
          Promise.resolve(Presence.get(uid))
            .then((entry: PresenceStoreEntry | undefined) => {
              if (currentUid !== uid) return;
              handlePresenceUpdate(entry ?? Presence.store?.get(uid));
            })
            .catch((error: unknown) => {
              console.warn(
                '[Rocket.Chat Desktop] Failed to read the initial presence',
                error
              );
            });
        } catch (error) {
          console.warn(
            '[Rocket.Chat Desktop] Failed to subscribe to presence updates',
            error
          );
        }
      };

      Tracker.autorun(() => {
        const uid: string | null = Meteor.userId();
        const conn = Meteor.status();

        latestConnectionStatus = conn?.status;

        subscribeToPresence(uid);
        pushPresence();
      });

      const SET_USER_STATUS_MIN_INTERVAL_MS = 1000;

      const presenceRateLimiter = createPresenceRateLimiter({
        minIntervalMs: SET_USER_STATUS_MIN_INTERVAL_MS,
        onDeferred: () => {
          console.warn(
            '[Rocket.Chat Desktop] setUserStatus request deferred: rate limit (1/s) not yet elapsed, will send latest status once elapsed'
          );
        },
        send: ({ status, statusText }) => {
          if (!Meteor.call) return;

          Meteor.call('setUserStatus', status, statusText, (err: any) => {
            if (!err) return;

            if (
              err.error === 'error-not-allowed' ||
              err.error === 'error-status-not-allowed'
            ) {
              console.warn(
                `[Rocket.Chat Desktop] setUserStatus rejected: ${err.error}`
              );
              return;
            }

            console.error('[Rocket.Chat Desktop] setUserStatus failed', err);
          });
        },
      });

      // No local refresh needed after a change request: the server broadcasts
      // the new presence (and statusText) back over `stream-user-presence`,
      // which reaches `handlePresenceUpdate` on its own — including changes
      // made on another device.
      window.RocketChatDesktop.onPresenceChangeRequested(
        (status, statusText) => {
          presenceRateLimiter.request({ status, statusText });
        }
      );

      setupFlags.userPresenceStatus = true;
    }

    if (Tracker && Meteor && !setupFlags.gitCommitHash) {
      Tracker.autorun(() => {
        const { gitCommitHash } = Meteor;
        if (!gitCommitHash) return;
        window.RocketChatDesktop.setGitCommitHash(gitCommitHash);
      });
      setupFlags.gitCommitHash = true;
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

start().catch((error) => {
  console.error('[Rocket.Chat Desktop] Injected.ts failed to start:', error);
});
