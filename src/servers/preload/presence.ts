import { ipcRenderer } from 'electron';

import { dispatch } from '../../store';
import { WEBVIEW_USER_PRESENCE_CHANGED } from '../../ui/actions';
import type { Server, UserPresence } from '../common';
import { createPresenceRateLimiter } from './presenceDebounce';
import { getServerUrl } from './urls';
import { setUserLoggedIn } from './userLoggedIn';

export type DesktopUserPresence = {
  loggedIn: boolean;
  connection: 'connected' | 'connecting' | 'disconnected';
  status?: UserPresence;
  statusText?: string;
  statusExpiresAt?: string;
  availableStatuses: UserPresence[];
  customStatuses: { id: string; name: string; status: UserPresence }[];
};

export type DesktopUserStatusChangeRequest = {
  status: UserPresence;
  customStatusId?: string;
};

type UserStatusChangeHandler = (
  request: DesktopUserStatusChangeRequest
) => Promise<void>;

type UserPresencePayload = {
  presence: Server['presence'];
  presenceStatusText: Server['presenceStatusText'];
  presenceConnection: Server['presenceConnection'];
  presenceSupported: Server['presenceSupported'];
};

const USER_PRESENCES: UserPresence[] = ['online', 'away', 'busy', 'offline'];
const PRESENCE_CONNECTIONS: DesktopUserPresence['connection'][] = [
  'connected',
  'connecting',
  'disconnected',
];
const MAX_CUSTOM_STATUSES = 100;
const MAX_STRING_LENGTH = 256;

type NormalizedUserPresence = Omit<DesktopUserPresence, 'connection'> & {
  connection?: DesktopUserPresence['connection'];
};

const isUserPresence = (value: unknown): value is UserPresence =>
  USER_PRESENCES.includes(value as UserPresence);

const isShortString = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= MAX_STRING_LENGTH;

const toArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

// The web page sends this snapshot, and the main process builds menu items
// and icon file paths from it. Keep only values of the expected shape.
const normalizeUserPresence = (input: unknown): NormalizedUserPresence => {
  const presence = (input ?? {}) as Record<string, unknown>;
  const { statusText, statusExpiresAt } = presence;

  return {
    loggedIn: presence.loggedIn === true,
    connection: PRESENCE_CONNECTIONS.find(
      (connection) => connection === presence.connection
    ),
    status: isUserPresence(presence.status) ? presence.status : undefined,
    statusText:
      typeof statusText === 'string'
        ? statusText.slice(0, MAX_STRING_LENGTH)
        : undefined,
    statusExpiresAt:
      isShortString(statusExpiresAt) &&
      !Number.isNaN(Date.parse(statusExpiresAt))
        ? statusExpiresAt
        : undefined,
    availableStatuses: toArray(presence.availableStatuses).filter(
      isUserPresence
    ),
    customStatuses: toArray(presence.customStatuses)
      .flatMap((entry) => {
        const { id, name, status } = (entry ?? {}) as Record<string, unknown>;
        return isShortString(id) &&
          typeof name === 'string' &&
          isUserPresence(status)
          ? [{ id, name: name.slice(0, MAX_STRING_LENGTH), status }]
          : [];
      })
      .slice(0, MAX_CUSTOM_STATUSES),
  };
};

let presenceStateReported = false;
let presenceStateReportedCallback: (() => void) | null = null;
let lastLoggedIn: boolean | undefined;
let storeReady = false;
let pendingPresenceState: NormalizedUserPresence | null = null;

export const onUserPresenceStateReported = (callback: () => void): void => {
  if (presenceStateReported) {
    callback();
    return;
  }

  presenceStateReportedCallback = callback;
};

export const setUserPresence = (payload: UserPresencePayload): void => {
  if (presenceStateReported) {
    return;
  }

  dispatch({
    type: WEBVIEW_USER_PRESENCE_CHANGED,
    payload: {
      url: getServerUrl(),
      ...payload,
    },
  });
};

const applyUserPresenceState = (presence: NormalizedUserPresence): void => {
  if (presence.loggedIn !== lastLoggedIn) {
    lastLoggedIn = presence.loggedIn;
    setUserLoggedIn(presence.loggedIn);
  }

  dispatch({
    type: WEBVIEW_USER_PRESENCE_CHANGED,
    payload: {
      url: getServerUrl(),
      presence: presence.status,
      presenceStatusText: presence.statusText || undefined,
      presenceConnection: presence.connection,
      presenceSupported: true,
      presenceStatusExpiresAt: presence.statusExpiresAt,
      presenceAvailableStatuses: presence.availableStatuses,
      presenceCustomStatuses: presence.customStatuses,
    },
  });
};

export const setUserPresenceState = (presence: DesktopUserPresence): void => {
  if (!presenceStateReported) {
    presenceStateReported = true;
    presenceStateReportedCallback?.();
  }

  const normalized = normalizeUserPresence(presence);

  // A dispatch before the renderer store exists is dropped. Keep the latest
  // snapshot until the preload start creates the store.
  if (!storeReady) {
    pendingPresenceState = normalized;
    return;
  }

  applyUserPresenceState(normalized);
};

export const markPresenceStoreReady = (): void => {
  storeReady = true;

  const pending = pendingPresenceState;
  pendingPresenceState = null;
  if (pending) {
    applyUserPresenceState(pending);
  }
};

type PresenceChangeCallback = (
  status: NonNullable<Server['presence']>,
  statusText?: string
) => void;

let presenceChangeCallback: PresenceChangeCallback | null = null;

export const onPresenceChangeRequested = (
  callback: PresenceChangeCallback
): void => {
  presenceChangeCallback = callback;
};

let userStatusChangeHandler: UserStatusChangeHandler | null = null;

export const setUserStatusChangeHandler = (
  handler: UserStatusChangeHandler
): void => {
  userStatusChangeHandler = handler;
};

const userStatusChangeLimiter = createPresenceRateLimiter({
  minIntervalMs: 1000,
  send: ({ status, customStatusId }) => {
    const handler = userStatusChangeHandler;
    if (!handler) {
      return;
    }

    Promise.resolve()
      .then(() =>
        handler({
          status: status as UserPresence,
          ...(customStatusId && { customStatusId }),
        })
      )
      .catch((error: unknown) => {
        console.warn('[Rocket.Chat Desktop] Status change failed', error);
      });
  },
});

let listening = false;

export const listenToPresenceChangeRequests = (): void => {
  if (listening) {
    return;
  }
  listening = true;

  ipcRenderer.on(
    'presence/change-requested',
    (
      _event,
      status: NonNullable<Server['presence']>,
      statusText?: string,
      customStatusId?: string
    ) => {
      if (userStatusChangeHandler) {
        userStatusChangeLimiter.request({ status, customStatusId });
        return;
      }

      if (presenceChangeCallback) {
        presenceChangeCallback(status, statusText);
      }
    }
  );
};
