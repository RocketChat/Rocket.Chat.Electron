import { ipcRenderer } from 'electron';

import { dispatch } from '../../store';
import { WEBVIEW_USER_PRESENCE_CHANGED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

type UserPresencePayload = {
  presence: Server['presence'];
  presenceStatusText: Server['presenceStatusText'];
  presenceConnection: Server['presenceConnection'];
  presenceSupported: Server['presenceSupported'];
};

export const setUserPresence = (payload: UserPresencePayload): void => {
  dispatch({
    type: WEBVIEW_USER_PRESENCE_CHANGED,
    payload: {
      url: getServerUrl(),
      ...payload,
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

let listening = false;

export const listenToPresenceChangeRequests = (): void => {
  if (listening) {
    return;
  }
  listening = true;

  ipcRenderer.on(
    'presence/change-requested',
    (_event, status: NonNullable<Server['presence']>, statusText?: string) => {
      if (presenceChangeCallback) {
        presenceChangeCallback(status, statusText);
      }
    }
  );
};
