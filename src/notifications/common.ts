export type NotificationCategory = 'DOWNLOADS' | 'SERVER';

// The web `Notification` action shape the page passes in, not Electron's.
export type NotificationActionOption = {
  action?: string;
  title: string;
};

export type ExtendedNotificationOptions = NotificationOptions & {
  canReply?: boolean;
  title: string;
  subtitle?: string;
  actions?: NotificationActionOption[];
  renotify?: boolean;
  requireInteraction?: boolean;
  restoreWindow?: boolean;
  notificationType?: 'voice' | 'text';
  category?: NotificationCategory;
};

export type CustomNotificationOptions = {
  type: 'voice' | 'text';
  id?: string;
  payload: {
    title: string;
    body: string;
    avatar?: string;
    silent?: boolean;
    requireInteraction?: boolean;
    restoreWindow?: boolean;
  };
};
