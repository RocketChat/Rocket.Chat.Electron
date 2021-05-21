export type ExtendedNotificationOptions = Omit<NotificationOptions, 'tag'> & {
  tag: string;
  canReply?: boolean;
  title: string;
};
