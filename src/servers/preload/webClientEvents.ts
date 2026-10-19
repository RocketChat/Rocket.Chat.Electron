import type { Server } from '../common';
import { setBadge } from './badge';
import { attemptBootRecovery, resetBootRecovery } from './bootRecovery';
import { createUnreadBadgeTracker } from './unreadBadge';
import { setUserLoggedIn } from './userLoggedIn';

// The web client fires these Iframe Integration CustomEvents on window in both
// its Meteor and its Vite build, and a preload listener receives them with
// their `detail` across the context-isolation boundary. They replace reads of
// the webapp's internal modules through `window.require`, which the Vite build
// does not have. `yarn probe:web-signals` checks this contract on a server.
export const BOOT_SIGNAL_TIMEOUT_MS = 30_000;

// Redux dispatches before the renderer store exists are dropped, and the web
// client can fire its first events before the preload connects the store, so
// values are held until connectWebClientEvents().
let connected = false;
let booted = false;
let bootTimer: ReturnType<typeof setTimeout> | null = null;
let pendingBadge: { badge: Server['badge'] } | undefined;
let userLoggedIn: boolean | undefined;
const bootedCallbacks: Array<() => void> = [];

const sendBadge = (badge: Server['badge']): void => {
  if (!connected) {
    pendingBadge = { badge };
    return;
  }
  setBadge(badge);
};

const unreadBadge = createUnreadBadgeTracker(sendBadge);

// The web client fires a login event on each `uid` change, and a logged-out
// boot fires only the logout event. setUserLoggedIn() drops repeats.
const sendUserLoggedIn = (): void => {
  if (!connected || userLoggedIn === undefined) {
    return;
  }
  setUserLoggedIn(userLoggedIn);
};

// Called on the web client's `startup` event, and by setServerInfo() for
// servers older than the event.
export const markWebClientBooted = (): void => {
  if (booted) {
    return;
  }
  booted = true;
  if (bootTimer !== null) {
    clearTimeout(bootTimer);
    bootTimer = null;
  }
  resetBootRecovery();
  bootedCallbacks.splice(0).forEach((callback) => callback());
};

export const onWebClientBooted = (callback: () => void): void => {
  if (booted) {
    callback();
    return;
  }
  bootedCallbacks.push(callback);
};

export const setUnreadAlertEnabled = (enabled: boolean): void => {
  unreadBadge.setUnreadAlertEnabled(enabled);
};

// Runs when the preload loads, before any page script, so `startup` is never
// missed.
export const listenToWebClientEvents = (): void => {
  window.addEventListener('startup', markWebClientBooted);
  window.addEventListener('unread-changed-by-subscription', (event) => {
    unreadBadge.onSubscriptionChanged((event as CustomEvent).detail);
  });
  window.addEventListener('unread-changed', (event) => {
    unreadBadge.onUnreadChanged((event as CustomEvent).detail);
  });
  window.addEventListener('Custom_Script_Logged_In', () => {
    userLoggedIn = true;
    sendUserLoggedIn();
  });
  window.addEventListener('Custom_Script_Logged_Out', () => {
    userLoggedIn = false;
    sendUserLoggedIn();
  });
};

// A wedged boot (stale service worker or cache serving a broken bundle) never
// mounts the web client's root layout, so `startup` never fires and only a
// cache-clearing reload recovers it.
export const connectWebClientEvents = (): void => {
  connected = true;

  if (pendingBadge) {
    setBadge(pendingBadge.badge);
    pendingBadge = undefined;
  }
  sendUserLoggedIn();

  if (booted || bootTimer !== null) {
    return;
  }
  bootTimer = setTimeout(() => {
    bootTimer = null;
    attemptBootRecovery(
      `The web client fired no startup event within ${BOOT_SIGNAL_TIMEOUT_MS}ms`
    );
  }, BOOT_SIGNAL_TIMEOUT_MS);
};
