export type ExtendedNotificationOptions = NotificationOptions & {
  canReply?: boolean;
  title: string;
  subtitle?: string;
  actions?: {
    title: string;
  }[];
  renotify?: boolean;
};
