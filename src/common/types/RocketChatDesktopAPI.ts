import type { Server } from './Server';

export type RocketChatDesktopAPI = {
  versionChanged(version: string): void;
  badgeChanged(badge: Server['badge']): void;
  faviconChanged(faviconUrl: string | undefined): void;
  backgroundChanged(backgroundUrl: string | undefined): void;
  titleChanged(title: Server['title']): void;
  userPresenceParamsChanged(
    autoAwayEnabled: boolean,
    idleThreshold: number | null
  ): void;
  setCallbacks(callbacks: {
    absoluteUrl: (path?: string) => string;
    setUserOnline: (online: boolean) => void;
  }): void;
  createNotification: (
    options: NotificationOptions & {
      canReply?: boolean;
      title: string;
      onEvent: (eventDescriptor: { type: string; detail: unknown }) => void;
    }
  ) => string;
  destroyNotification: (id: string) => void;
  absoluteUrl(path?: string): string;
  setUserOnline(online: boolean): void;
  getServerUrl(): Server['url'];
};
