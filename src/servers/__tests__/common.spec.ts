import {
  isConferencePageUrl,
  isServerUrlResolutionResult,
  ServerUrlResolutionStatus,
} from '../common';

describe('servers/common', () => {
  it('returns false for non-array objects', () => {
    expect(isServerUrlResolutionResult({})).toBe(false);
    expect(isServerUrlResolutionResult(null)).toBe(false);
  });

  it('returns true for ok resolution result', () => {
    expect(
      isServerUrlResolutionResult([
        'https://chat.example',
        ServerUrlResolutionStatus.OK,
      ])
    ).toBe(true);
  });

  it('returns true for error resolution result with timeout', () => {
    expect(
      isServerUrlResolutionResult([
        'https://chat.example',
        ServerUrlResolutionStatus.TIMEOUT,
        new Error('timeout'),
      ])
    ).toBe(true);
  });

  it('requires a string url for a successful result', () => {
    expect(
      isServerUrlResolutionResult([123, ServerUrlResolutionStatus.OK] as [
        any,
        any,
      ])
    ).toBe(false);
  });

  it('requires timeout error shape with object error details for error tuples', () => {
    expect(
      isServerUrlResolutionResult([
        'https://chat.example',
        ServerUrlResolutionStatus.TIMEOUT,
        'timeout',
      ])
    ).toBe(false);
  });

  it('returns false for invalid status values', () => {
    expect(
      isServerUrlResolutionResult([
        'https://chat.example',
        'invalid-status' as ServerUrlResolutionStatus,
        {},
      ])
    ).toBe(false);
  });

  describe('isConferencePageUrl', () => {
    it('matches conference pages of the server', () => {
      expect(
        isConferencePageUrl(
          'https://chat.example/conference/abc?scheduled=true',
          'https://chat.example/'
        )
      ).toBe(true);
      expect(
        isConferencePageUrl(
          'https://chat.example/conference/abc',
          'https://chat.example'
        )
      ).toBe(true);
    });

    it('honors a server hosted under a sub-path', () => {
      expect(
        isConferencePageUrl(
          'https://example.com/chat/conference/abc',
          'https://example.com/chat/'
        )
      ).toBe(true);
      expect(
        isConferencePageUrl(
          'https://example.com/conference/abc',
          'https://example.com/chat/'
        )
      ).toBe(false);
    });

    it('does not match other pages', () => {
      expect(
        isConferencePageUrl(
          'https://chat.example/channel/conference',
          'https://chat.example/'
        )
      ).toBe(false);
      expect(
        isConferencePageUrl(
          'https://chat.example/conferences',
          'https://chat.example/'
        )
      ).toBe(false);
      expect(isConferencePageUrl('not a url', 'https://chat.example/')).toBe(
        false
      );
    });
  });
});
