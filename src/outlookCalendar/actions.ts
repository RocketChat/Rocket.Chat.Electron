import { Server } from '../servers/common';
import { OutlookCredentials } from './type';

export const OUTLOOK_CALENDAR_SET_CREDENTIALS =
  'outlook-calendar/set-credentials';
export const OUTLOOK_CALENDAR_ASK_CREDENTIALS =
  'outlook-calendar/ask-credentials';
export const OUTLOOK_CALENDAR_DIALOG_DISMISSED =
  'outlook-calendar/dialog-dismissed';

export type OutlookCalendarActionTypeToPayloadMap = {
  [OUTLOOK_CALENDAR_SET_CREDENTIALS]: {
    url: Server['url'];
    outlookCredentials: OutlookCredentials;
  };
  [OUTLOOK_CALENDAR_ASK_CREDENTIALS]: { server: Server; userId: string };
  [OUTLOOK_CALENDAR_DIALOG_DISMISSED]: void;
};
