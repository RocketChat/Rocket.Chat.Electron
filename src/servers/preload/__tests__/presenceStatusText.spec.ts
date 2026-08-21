import { parseUsersInfoStatusText } from '../presenceStatusText';

describe('parseUsersInfoStatusText', () => {
  it('returns the statusText on a successful response', () => {
    expect(
      parseUsersInfoStatusText({
        success: true,
        user: { statusText: 'In a meeting' },
      })
    ).toBe('In a meeting');
  });

  it('normalises an empty string statusText to undefined', () => {
    expect(
      parseUsersInfoStatusText({
        success: true,
        user: { statusText: '' },
      })
    ).toBeUndefined();
  });

  it('returns undefined when the response has no user', () => {
    expect(
      parseUsersInfoStatusText({
        success: true,
      })
    ).toBeUndefined();
  });

  it('returns undefined when success is false', () => {
    expect(
      parseUsersInfoStatusText({
        success: false,
        user: { statusText: 'In a meeting' },
      })
    ).toBeUndefined();
  });

  it('returns undefined for malformed/null json', () => {
    expect(parseUsersInfoStatusText(null)).toBeUndefined();
    expect(parseUsersInfoStatusText(undefined)).toBeUndefined();
    expect(parseUsersInfoStatusText('not an object')).toBeUndefined();
    expect(parseUsersInfoStatusText(42)).toBeUndefined();
  });

  it('returns undefined when statusText is missing from the user object', () => {
    expect(
      parseUsersInfoStatusText({
        success: true,
        user: {},
      })
    ).toBeUndefined();
  });
});
