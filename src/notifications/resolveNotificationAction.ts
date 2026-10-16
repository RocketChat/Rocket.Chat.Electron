import type { NotificationActionOption } from './common';

// Mirrors the web `NotificationEvent.action`: the id of the clicked button, or
// an empty string when it cannot be resolved. The web client filters on it
// (`event.action !== 'join'`), so dispatching only the index drops the click.
export const resolveNotificationAction = (
  actions: readonly NotificationActionOption[] | undefined,
  detail: unknown
): string => {
  if (
    typeof detail !== 'object' ||
    detail === null ||
    !('index' in detail) ||
    typeof detail.index !== 'number'
  ) {
    return '';
  }

  return actions?.[detail.index]?.action ?? '';
};
