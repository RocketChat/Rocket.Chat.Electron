import { ipcRenderer } from 'electron';

type TelephonyPayload = { phoneNumber: string; rawUri: string };

let telephonyCallback: ((payload: TelephonyPayload) => void) | null = null;
let pendingPayload: TelephonyPayload | null = null;

export const onTelephonyCallRequested = (
  callback: (payload: TelephonyPayload) => void
): void => {
  telephonyCallback = callback;
  if (pendingPayload) {
    callback(pendingPayload);
    pendingPayload = null;
  }
};

export const listenToTelephonyRequests = (): void => {
  ipcRenderer.on(
    'telephony/call-requested',
    (_event, payload: TelephonyPayload) => {
      if (telephonyCallback) {
        telephonyCallback(payload);
      } else {
        pendingPayload = payload;
      }
    }
  );
};
