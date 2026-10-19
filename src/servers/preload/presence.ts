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

let presenceStateReported = false;
let presenceStateReportedCallback: (() => void) | null = null;
let lastLoggedIn: boolean | undefined;

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

export const setUserPresenceState = (presence: DesktopUserPresence): void => {
  if (!presenceStateReported) {
    presenceStateReported = true;
    presenceStateReportedCallback?.();
  }

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
    userStatusChangeHandler?.({
      status: status as UserPresence,
      ...(customStatusId && { customStatusId }),
    }).catch((error: unknown) => {
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
