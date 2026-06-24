import { ipcRenderer } from 'electron';

type TelephonyPayload = { phoneNumber: string; rawUri: string };

// A buffered deeplink expires after this window. If the target workspace never
// registers a callback (e.g. it lacks VoIP), the payload is silently dropped
// instead of lingering and surfacing on a much-later unrelated remount.
const PENDING_PAYLOAD_TTL_MS = 120_000;

let telephonyCallback: ((payload: TelephonyPayload) => void) | null = null;
let pendingPayload: TelephonyPayload | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

const clearPendingPayload = (): void => {
  pendingPayload = null;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
};

export const onTelephonyCallRequested = (
  callback: (payload: TelephonyPayload) => void
): void => {
  telephonyCallback = callback;
  if (pendingPayload) {
    const payload = pendingPayload;
    clearPendingPayload();
    callback(payload);
  }
};

let listening = false;

export const listenToTelephonyRequests = (): void => {
  if (listening) {
    return;
  }
  listening = true;

  ipcRenderer.on(
    'telephony/call-requested',
    (_event, payload: TelephonyPayload) => {
      if (telephonyCallback) {
        telephonyCallback(payload);
      } else {
        clearPendingPayload();
        pendingPayload = payload;
        pendingTimer = setTimeout(clearPendingPayload, PENDING_PAYLOAD_TTL_MS);
      }
    }
  );
};
