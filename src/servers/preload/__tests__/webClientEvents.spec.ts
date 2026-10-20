/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-var-requires -- the bridge keeps
   module state, so each test loads a fresh copy inside jest.isolateModules */

import type * as WebClientEvents from '../webClientEvents';

jest.mock('../badge', () => ({ setBadge: jest.fn() }));
jest.mock('../userLoggedIn', () => ({ setUserLoggedIn: jest.fn() }));
jest.mock('../reloadServer', () => ({ reloadServer: jest.fn() }));
jest.mock('../urls', () => ({
  getServerUrl: jest.fn(() => `${window.location.origin}/`),
}));

type Bridge = typeof WebClientEvents;

const BOOT_RECOVERY_ATTEMPTS_KEY = 'rocketChatDesktopBootRecoveryAttempts';

// Sequences that `yarn probe:web-signals` recorded in an isolated world on a
// Rocket.Chat develop server (2026-10-19), with the payloads trimmed.
const LOGGED_OUT_BOOT: Array<[string, unknown]> = [
  ['startup', true],
  ['Custom_Script_Logged_Out', null],
];

const LOGGED_IN_BOOT: Array<[string, unknown]> = [
  ['status-changed', 'online'],
  ['startup', true],
  ['Custom_Script_Logged_In', null],
  ['unread-changed-by-subscription', { rid: 'general', unread: 0 }],
  ['unread-changed-by-subscription', { rid: 'dm', unread: 0, alert: true }],
  ['unread-changed', 6],
  ['unread-changed', 6],
];

const INCOMING_MESSAGE: Array<[string, unknown]> = [
  ['unread-changed', 6],
  ['unread-changed-by-subscription', { rid: 'dm', unread: 1, alert: true }],
  ['unread-changed', 7],
  ['notification', { notification: { title: 'sender' } }],
  ['unread-changed', 7],
];

const FORCED_LOGOUT: Array<[string, unknown]> = [
  ['status-changed', 'online'],
  ['Custom_Script_Logged_Out', null],
];

const replay = (events: Array<[string, unknown]>) =>
  events.forEach(([name, detail]) =>
    window.dispatchEvent(new CustomEvent(name, { detail }))
  );

describe('servers/preload/webClientEvents', () => {
  const listeners: Array<[string, EventListenerOrEventListenerObject]> = [];
  let bridge: Bridge;
  let setBadge: jest.Mock;
  let setUserLoggedIn: jest.Mock;
  let reloadServer: jest.Mock;
  let getServerUrl: jest.Mock;

  const load = () => {
    jest.isolateModules(() => {
      bridge = require('../webClientEvents');
      ({ setBadge } = require('../badge'));
      ({ setUserLoggedIn } = require('../userLoggedIn'));
      ({ reloadServer } = require('../reloadServer'));
      ({ getServerUrl } = require('../urls'));
    });
    bridge.listenToWebClientEvents();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const addEventListener = window.addEventListener.bind(window);
    jest
      .spyOn(window, 'addEventListener')
      .mockImplementation((type, listener, options) => {
        listeners.push([type, listener]);
        addEventListener(type, listener, options);
      });
    window.sessionStorage.clear();
    load();
  });

  afterEach(() => {
    listeners
      .splice(0)
      .forEach(([type, listener]) =>
        window.removeEventListener(type, listener)
      );
    jest.useRealTimers();
    jest.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('reports the badge and the login of a logged-in boot', () => {
    bridge.connectWebClientEvents();
    replay(LOGGED_IN_BOOT);
    jest.advanceTimersByTime(100);

    expect(setUserLoggedIn).toHaveBeenCalledWith(true);
    expect(setBadge).toHaveBeenCalledTimes(1);
    expect(setBadge).toHaveBeenCalledWith(6);

    replay(INCOMING_MESSAGE);
    jest.advanceTimersByTime(100);
    expect(setBadge).toHaveBeenLastCalledWith(7);

    replay(FORCED_LOGOUT);
    expect(setUserLoggedIn).toHaveBeenLastCalledWith(false);
  });

  // Rocket.Chat 9.x pushes the badge it resolved (with the user's
  // `unreadAlert` preference) through RocketChatDesktop.setBadge. Older
  // servers never call it, so the unread events keep the badge there.
  it('lets the web client own the badge after its first direct setBadge', () => {
    bridge.connectWebClientEvents();
    replay(LOGGED_IN_BOOT);

    bridge.setBadgeFromWebClient(0);
    jest.advanceTimersByTime(100);
    expect(setBadge).toHaveBeenCalledTimes(1);
    expect(setBadge).toHaveBeenLastCalledWith(0);

    replay(INCOMING_MESSAGE);
    jest.advanceTimersByTime(100);
    expect(setBadge).toHaveBeenCalledTimes(1);

    bridge.setBadgeFromWebClient(7);
    expect(setBadge).toHaveBeenLastCalledWith(7);
  });

  it('holds a direct setBadge that arrives before the store connects', () => {
    replay(LOGGED_IN_BOOT);
    bridge.setBadgeFromWebClient('•');
    jest.advanceTimersByTime(100);
    expect(setBadge).not.toHaveBeenCalled();

    bridge.connectWebClientEvents();

    expect(setBadge).toHaveBeenCalledTimes(1);
    expect(setBadge).toHaveBeenCalledWith('•');
  });

  it('holds the events that arrive before the store connects', () => {
    replay(LOGGED_IN_BOOT);
    jest.advanceTimersByTime(100);
    expect(setBadge).not.toHaveBeenCalled();
    expect(setUserLoggedIn).not.toHaveBeenCalled();

    bridge.connectWebClientEvents();

    expect(setBadge).toHaveBeenCalledWith(6);
    expect(setUserLoggedIn).toHaveBeenCalledWith(true);
  });

  it('reports a logged-out boot as logged out', () => {
    bridge.connectWebClientEvents();
    replay(LOGGED_OUT_BOOT);

    expect(setUserLoggedIn).toHaveBeenCalledTimes(1);
    expect(setUserLoggedIn).toHaveBeenCalledWith(false);
  });

  it('starts the integrations on startup and clears the recovery counter', () => {
    window.sessionStorage.setItem(BOOT_RECOVERY_ATTEMPTS_KEY, '1');
    const onBooted = jest.fn();
    bridge.onWebClientBooted(onBooted);

    bridge.connectWebClientEvents();
    replay(LOGGED_OUT_BOOT);
    jest.advanceTimersByTime(60_000);

    expect(onBooted).toHaveBeenCalledTimes(1);
    expect(reloadServer).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(BOOT_RECOVERY_ATTEMPTS_KEY)).toBe(
      null
    );
  });

  it('counts a startup that fired before the store connected', () => {
    replay(LOGGED_OUT_BOOT);
    bridge.connectWebClientEvents();
    jest.advanceTimersByTime(60_000);

    expect(reloadServer).not.toHaveBeenCalled();
  });

  it('counts server info from the legacy integration as a boot', () => {
    bridge.connectWebClientEvents();
    bridge.markWebClientBooted();
    jest.advanceTimersByTime(60_000);

    expect(reloadServer).not.toHaveBeenCalled();
  });

  it('reloads with a cache clear when no startup arrives in time', () => {
    bridge.connectWebClientEvents();

    jest.advanceTimersByTime(bridge.BOOT_SIGNAL_TIMEOUT_MS - 1);
    expect(reloadServer).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(reloadServer).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(BOOT_RECOVERY_ATTEMPTS_KEY)).toBe('1');
  });

  it('does not reload a page of another origin, such as an SSO login page', () => {
    getServerUrl.mockReturnValue('https://chat.example.com/');
    bridge.connectWebClientEvents();

    jest.advanceTimersByTime(60_000);

    expect(reloadServer).not.toHaveBeenCalled();
  });

  it('stops recovering after the attempt cap', () => {
    window.sessionStorage.setItem(BOOT_RECOVERY_ATTEMPTS_KEY, '2');
    bridge.connectWebClientEvents();

    jest.advanceTimersByTime(bridge.BOOT_SIGNAL_TIMEOUT_MS);

    expect(reloadServer).not.toHaveBeenCalled();
  });
});
