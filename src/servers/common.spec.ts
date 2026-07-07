import { isServerUrlResolutionResult, ServerUrlResolutionStatus } from './common';

describe('servers/common', () => {
  it('returns false for non-array objects', () => {
    expect(isServerUrlResolutionResult({})).toBe(false);
    expect(isServerUrlResolutionResult(null)).toBe(false);
  });

  it('returns true for ok resolution result', () => {
    expect(
      isServerUrlResolutionResult(['https://chat.example', ServerUrlResolutionStatus.OK])
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
      isServerUrlResolutionResult([123, ServerUrlResolutionStatus.OK] as [any, any])
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
});
