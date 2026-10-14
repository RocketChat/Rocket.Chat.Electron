import { resolveNotificationAction } from '../resolveNotificationAction';

describe('resolveNotificationAction', () => {
  const actions = [
    { action: 'join', title: 'Join call' },
    { action: 'decline', title: 'Decline' },
  ];

  it('returns the action id of the clicked button', () => {
    expect(resolveNotificationAction(actions, { index: 0 })).toBe('join');
    expect(resolveNotificationAction(actions, { index: 1 })).toBe('decline');
  });

  it('returns an empty string for an index without a button', () => {
    expect(resolveNotificationAction(actions, { index: 2 })).toBe('');
    expect(resolveNotificationAction(actions, { index: -1 })).toBe('');
  });

  it('returns an empty string when the button has no action id', () => {
    expect(
      resolveNotificationAction([{ title: 'Join call' }], { index: 0 })
    ).toBe('');
  });

  it('returns an empty string for a malformed event detail', () => {
    expect(resolveNotificationAction(actions, undefined)).toBe('');
    expect(resolveNotificationAction(actions, { index: '0' })).toBe('');
    expect(resolveNotificationAction(undefined, { index: 0 })).toBe('');
  });
});
