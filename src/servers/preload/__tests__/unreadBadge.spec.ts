/** @jest-environment jsdom */
import { createUnreadBadgeTracker } from '../unreadBadge';

describe('servers/preload/unreadBadge', () => {
  let send: jest.Mock;
  let tracker: ReturnType<typeof createUnreadBadgeTracker>;

  beforeEach(() => {
    jest.useFakeTimers();
    send = jest.fn();
    tracker = createUnreadBadgeTracker(send);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('coalesces a boot burst into one badge with the aggregate count', () => {
    for (let index = 0; index < 50; index++) {
      tracker.onSubscriptionChanged({ rid: `room-${index}`, unread: 0 });
    }
    tracker.onSubscriptionChanged({ rid: 'room-x', unread: 2 });
    tracker.onUnreadChanged(6);
    tracker.onUnreadChanged(6);

    jest.advanceTimersByTime(100);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(6);
  });

  it('shows the alert-only indicator when no room has a count', () => {
    tracker.onSubscriptionChanged({ rid: 'room', unread: 0, alert: true });
    tracker.onUnreadChanged(0);

    jest.advanceTimersByTime(100);

    expect(send).toHaveBeenLastCalledWith('•');
  });

  it('follows the unreadAlert preference of the user and of the room', () => {
    tracker.onSubscriptionChanged({ rid: 'room', unread: 0, alert: true });
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith('•');

    tracker.setUnreadAlertEnabled(false);
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith(0);

    tracker.onSubscriptionChanged({
      rid: 'room',
      unread: 0,
      alert: true,
      unreadAlert: 'all',
    });
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith('•');

    tracker.onSubscriptionChanged({
      rid: 'room',
      unread: 0,
      alert: true,
      unreadAlert: 'nothing',
    });
    tracker.setUnreadAlertEnabled(true);
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith(0);
  });

  it('keeps the aggregate count when only the preference changes', () => {
    tracker.onSubscriptionChanged({ rid: 'room', unread: 2 });
    tracker.onUnreadChanged(6);
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith(6);

    tracker.setUnreadAlertEnabled(false);
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith(6);
  });

  it('drops the aggregate count on a room change or an invalid payload', () => {
    tracker.onSubscriptionChanged({ rid: 'room', unread: 2 });
    tracker.onUnreadChanged(6);
    jest.advanceTimersByTime(100);

    tracker.onSubscriptionChanged({ rid: 'room', unread: 1 });
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith(1);

    tracker.onUnreadChanged(6);
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith(6);

    tracker.onUnreadChanged('7');
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith(1);
  });

  it('counts details that are not an unread payload as no unread', () => {
    tracker.onSubscriptionChanged(null);
    tracker.onSubscriptionChanged({ unread: 3 });
    tracker.onUnreadChanged('7');

    jest.advanceTimersByTime(100);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(0);
  });
});
