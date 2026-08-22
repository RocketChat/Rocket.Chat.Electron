import { validateVideoCallUrl } from '../validateVideoCallUrl';

describe('validateVideoCallUrl', () => {
  it('accepts http and https urls', () => {
    expect(validateVideoCallUrl('https://meet.example/room')).toBe(
      'https://meet.example/room'
    );
    expect(validateVideoCallUrl('http://localhost:8080/call')).toContain(
      'http://localhost:8080/call'
    );
  });

  it('rejects non-http(s) protocols', () => {
    expect(() => validateVideoCallUrl('file:///etc/passwd')).toThrow(
      /Invalid URL protocol/
    );
    expect(() => validateVideoCallUrl('javascript:alert(1)')).toThrow(
      /Invalid URL protocol/
    );
  });

  it('rejects malformed urls', () => {
    expect(() => validateVideoCallUrl('not a url')).toThrow(/Invalid URL/);
  });
});
