import { memoize } from '@rocket.chat/memo';

import { inferContentTypeFromImageData } from '../common/helpers/inferContentTypeFromImageData';
import type { ExtendedNotificationOptions } from '../common/types/ExtendedNotificationOptions';

const eventHandlers = new Map<
  unknown,
  (eventDescriptor: { type: string; detail?: unknown }) => void
>();

const normalizeIconUrl = (
  absoluteUrl: (path?: string) => string,
  iconUrl: string
): string => {
  if (/^data:/.test(iconUrl)) {
    return iconUrl;
  }

  if (!/^https?:\/\//.test(iconUrl)) {
    return absoluteUrl(iconUrl);
  }

  return iconUrl;
};

const fetchIcon = memoize(async (iconUrl: string): Promise<string> => {
  const response = await fetch(iconUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64String = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );
  const contentType =
    inferContentTypeFromImageData(arrayBuffer) ||
    response.headers.get('content-type');
  return `data:${contentType};base64,${base64String}`;
});

export const toExtendedNotificationOptions = async (
  id: string,
  {
    title,
    icon,
    ...options
  }: NotificationOptions & {
    canReply?: boolean;
    title: string;
  },
  absoluteUrl: (path?: string) => string
): Promise<ExtendedNotificationOptions> => {
  const resolvedIcon = icon
    ? await fetchIcon(normalizeIconUrl(absoluteUrl, icon))
    : undefined;

  return {
    tag: id,
    title,
    ...(resolvedIcon && {
      icon: resolvedIcon,
    }),
    ...options,
  };
};

export const registerNotificationEventHandler = (
  id: string,
  onEvent: (eventDescriptor: { type: string; detail: unknown }) => void
): void => {
  eventHandlers.set(id, (event) =>
    onEvent({ type: event.type, detail: event.detail })
  );
};

export const unregisterNotificationEventHandler = (id: string): void => {
  eventHandlers.delete(id);
};

export const triggerNotificationEvent = (
  id: unknown,
  eventDescriptor: { type: string; detail?: unknown }
): void => {
  eventHandlers.get(id)?.(eventDescriptor);

  if (eventDescriptor.type === 'close') {
    eventHandlers.delete(id);
  }
};
