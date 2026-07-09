import {
  NOTIFICATIONS_CREATE_REQUESTED,
  NOTIFICATIONS_CREATE_RESPONDED,
  NOTIFICATIONS_NOTIFICATION_ACTIONED,
  NOTIFICATIONS_NOTIFICATION_CLICKED,
  NOTIFICATIONS_NOTIFICATION_CLOSED,
  NOTIFICATIONS_NOTIFICATION_DISMISSED,
  NOTIFICATIONS_NOTIFICATION_REPLIED,
  NOTIFICATIONS_NOTIFICATION_SHOWN,
} from '../actions';

describe('notifications/actions', () => {
  it('exposes expected notification action type constants', () => {
    expect(NOTIFICATIONS_CREATE_REQUESTED).toBe(
      'notifications/create-requested'
    );
    expect(NOTIFICATIONS_CREATE_RESPONDED).toBe(
      'notifications/create-responded'
    );
    expect(NOTIFICATIONS_NOTIFICATION_ACTIONED).toBe(
      'notifications/notification-actioned'
    );
    expect(NOTIFICATIONS_NOTIFICATION_CLICKED).toBe(
      'notifications/notification-clicked'
    );
    expect(NOTIFICATIONS_NOTIFICATION_CLOSED).toBe(
      'notifications/notification-closed'
    );
    expect(NOTIFICATIONS_NOTIFICATION_DISMISSED).toBe(
      'notifications/notification-dismissed'
    );
    expect(NOTIFICATIONS_NOTIFICATION_REPLIED).toBe(
      'notifications/notification-replied'
    );
    expect(NOTIFICATIONS_NOTIFICATION_SHOWN).toBe(
      'notifications/notification-shown'
    );
  });
});
