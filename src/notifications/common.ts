export type ExtendedNotificationOptions = NotificationOptions & {
  canReply?: boolean;
  title: string;
  subtitle?: string;
  actions?: {
    title: string;
  }[];
  renotify?: boolean;
};

export type CustomNotificationOptions = {
  type: 'voice' | 'text';
  payload: {
    title: string;
    body: string;
    avatar?: string;
    silent?: boolean;
  };
};
