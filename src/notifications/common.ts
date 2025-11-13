export type ExtendedNotificationOptions = NotificationOptions & {
  canReply?: boolean;
  title: string;
  subtitle?: string;
  actions?: {
    title: string;
  }[];
  renotify?: boolean;
  requireInteraction?: boolean;
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
  };
};
