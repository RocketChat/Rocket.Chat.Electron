import type { Server } from '../common';

type SubscriptionUnread = {
  unread: number;
  alert?: boolean;
  unreadAlert?: string;
};

export type UnreadBadgeTracker = {
  onSubscriptionChanged: (detail: unknown) => void;
  onUnreadChanged: (detail: unknown) => void;
  setUnreadAlertEnabled: (enabled: boolean) => void;
};

// Server boot floods the unread events: the webapp fires one
// `unread-changed-by-subscription` event per room when it starts, and a badge
// dispatch for each one storms the root window's Redux store hard enough that
// React aborts with "Maximum update depth exceeded". Recomputes are therefore
// coalesced into a single trailing-edge call.
const BADGE_COALESCE_MS = 100;

// Rebuilds the badge from the two unread CustomEvents the web client fires on
// window, exactly as its own `useUnread` hook resolves it: a positive count
// wins, otherwise an alert-only "•", otherwise no badge.
//   - `unread-changed-by-subscription` carries { rid, unread, alert,
//     unreadAlert } per room. The map rebuilds the "•" indicator that the
//     numeric count alone cannot represent.
//   - `unread-changed` carries the aggregate count. The map only sees rooms
//     that changed after the listener attached, so it can undercount; the
//     aggregate wins for the numeric total.
export const createUnreadBadgeTracker = (
  send: (badge: Server['badge']) => void
): UnreadBadgeTracker => {
  const subscriptions = new Map<string, SubscriptionUnread>();
  // The user's `unreadAlert` preference only influences rooms left on the
  // default. No event carries it, so it defaults to the server's shipped
  // default and the legacy integration pushes the real value when it can.
  let unreadAlertEnabled = true;
  let pendingAggregateCount: number | undefined;
  let pendingAggregateInvalidation = false;
  let lastAggregateCount: number | undefined;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const resolve = (): Server['badge'] => {
    let unreadCount = 0;
    let alertIndicator: '•' | undefined;

    for (const { unread, alert, unreadAlert } of subscriptions.values()) {
      if (!alert && unread <= 0) {
        continue;
      }
      if (
        alert === true &&
        unreadAlert !== 'nothing' &&
        (unreadAlert === 'all' || unreadAlertEnabled)
      ) {
        alertIndicator = '•';
      }
      unreadCount += unread;
    }

    const total =
      lastAggregateCount !== undefined && lastAggregateCount > unreadCount
        ? lastAggregateCount
        : unreadCount;

    return total > 0 ? total : alertIndicator ?? 0;
  };

  const flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    // Only the latest `unread-changed` of a burst is authoritative. A room
    // change or an invalid payload with no new aggregate drops the earlier
    // total, because it can be stale. A preference change alone keeps it.
    if (pendingAggregateCount !== undefined) {
      lastAggregateCount = pendingAggregateCount;
    } else if (pendingAggregateInvalidation) {
      lastAggregateCount = undefined;
    }
    pendingAggregateCount = undefined;
    pendingAggregateInvalidation = false;
    send(resolve());
  };

  const schedule = (
    aggregateCount?: number,
    invalidateAggregate = false
  ): void => {
    if (aggregateCount !== undefined) {
      pendingAggregateCount = aggregateCount;
    }
    pendingAggregateInvalidation ||= invalidateAggregate;
    if (timer !== null) {
      return;
    }
    timer = setTimeout(flush, BADGE_COALESCE_MS);
  };

  return {
    onSubscriptionChanged: (detail) => {
      const subscription = detail as Partial<
        SubscriptionUnread & { rid: string }
      > | null;
      if (!subscription?.rid) {
        return;
      }
      subscriptions.set(subscription.rid, {
        unread: subscription.unread ?? 0,
        alert: subscription.alert,
        unreadAlert: subscription.unreadAlert,
      });
      schedule(undefined, true);
    },
    onUnreadChanged: (detail) => {
      if (typeof detail === 'number' && Number.isFinite(detail)) {
        schedule(detail);
        return;
      }
      schedule(undefined, true);
    },
    setUnreadAlertEnabled: (enabled) => {
      if (enabled === unreadAlertEnabled) {
        return;
      }
      unreadAlertEnabled = enabled;
      schedule();
    },
  };
};
