import { ExtendedNotificationOptions } from './common';

export const NOTIFICATIONS_CREATE_REQUESTED = 'notifications/create-requested';
export const NOTIFICATIONS_CREATE_RESPONDED = 'notifications/create-responded';
export const NOTIFICATIONS_NOTIFICATION_ACTIONED =
  'notifications/notification-actioned';
export const NOTIFICATIONS_NOTIFICATION_CLICKED =
  'notifications/notification-clicked';
export const NOTIFICATIONS_NOTIFICATION_CLOSED =
  'notifications/notification-closed';
export const NOTIFICATIONS_NOTIFICATION_DISMISSED =
  'notifications/notification-dismissed';
export const NOTIFICATIONS_NOTIFICATION_REPLIED =
  'notifications/notification-replied';
export const NOTIFICATIONS_NOTIFICATION_SHOWN =
  'notifications/notification-shown';

export type NotificationsActionTypeToPayloadMap = {
  [NOTIFICATIONS_CREATE_REQUESTED]: ExtendedNotificationOptions;
  [NOTIFICATIONS_CREATE_RESPONDED]: unknown;
  [NOTIFICATIONS_NOTIFICATION_ACTIONED]: { id: unknown; index: number };
  [NOTIFICATIONS_NOTIFICATION_CLICKED]: { id: unknown; title: string };
  [NOTIFICATIONS_NOTIFICATION_CLOSED]: { id: unknown };
  [NOTIFICATIONS_NOTIFICATION_DISMISSED]: { id: unknown };
  [NOTIFICATIONS_NOTIFICATION_REPLIED]: { id: unknown; reply: string };
  [NOTIFICATIONS_NOTIFICATION_SHOWN]: { id: unknown };
};
