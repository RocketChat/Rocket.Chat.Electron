import { Server } from '../servers/common';
import { OutlookCredentials } from './type';

export const OUTLOOK_CALENDAR_SET_CREDENTIALS =
  'outlook-calendar/set-credentials';
export type OutlookCalendarActionTypeToPayloadMap = {
  [OUTLOOK_CALENDAR_SET_CREDENTIALS]: {
    url: Server['url'];
    outlookCredentials: OutlookCredentials;
  };
};
