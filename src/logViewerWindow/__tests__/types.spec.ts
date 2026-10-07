import { isLogLevel, parseLogLevel } from '../types';

describe('logViewerWindow types', () => {
  it('recognizes valid log levels', () => {
    expect(isLogLevel('info')).toBe(true);
    expect(isLogLevel('warn')).toBe(true);
    expect(isLogLevel('ERROR')).toBe(true);
  });

  it('rejects invalid log levels', () => {
    expect(isLogLevel('verbose-debug')).toBe(false);
    expect(isLogLevel(42)).toBe(false);
    expect(isLogLevel(null)).toBe(false);
  });

  it('parses values into log levels with defaults and trimming', () => {
    expect(parseLogLevel(' warn ')).toBe('warn');
    expect(parseLogLevel(' ERROR ')).toBe('error');
    expect(parseLogLevel('invalid')).toBe('info');
    expect(parseLogLevel(42)).toBe('info');
  });
});
