import type { Server } from '../servers/common';
import type { OutlookCredentials } from './type';

export const OUTLOOK_CALENDAR_SET_CREDENTIALS =
  'outlook-calendar/set-credentials';
export const OUTLOOK_CALENDAR_ASK_CREDENTIALS =
  'outlook-calendar/ask-credentials';
export const OUTLOOK_CALENDAR_DIALOG_DISMISSED =
  'outlook-calendar/dialog-dismissed';
export const OUTLOOK_CALENDAR_SAVE_CREDENTIALS =
  'outlook-calendar/save-credentials';

export type OutlookCalendarActionTypeToPayloadMap = {
  [OUTLOOK_CALENDAR_SET_CREDENTIALS]: {
    url: Server['url'];
    outlookCredentials: OutlookCredentials;
    saveCredentials?: boolean;
    dismissDialog?: boolean;
  };
  [OUTLOOK_CALENDAR_ASK_CREDENTIALS]: {
    server: Server;
    userId: string;
    isEncryptionAvailable: boolean;
  };
  [OUTLOOK_CALENDAR_DIALOG_DISMISSED]: void;
  [OUTLOOK_CALENDAR_SAVE_CREDENTIALS]: {
    url: Server['url'];
    outlookCredentials: OutlookCredentials;
  };
};
