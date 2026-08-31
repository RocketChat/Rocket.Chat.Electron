import { isAtLeastLevel, isLogLevel, parseLogLevel } from '../types';

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

describe('isAtLeastLevel', () => {
  it('orders levels silly < verbose < debug < info < warn < error', () => {
    expect(isAtLeastLevel('silly', 'silly')).toBe(true);
    expect(isAtLeastLevel('verbose', 'silly')).toBe(true);
    expect(isAtLeastLevel('debug', 'verbose')).toBe(true);
    expect(isAtLeastLevel('info', 'debug')).toBe(true);
    expect(isAtLeastLevel('warn', 'info')).toBe(true);
    expect(isAtLeastLevel('error', 'warn')).toBe(true);
  });

  it('returns false when level is below the minimum', () => {
    expect(isAtLeastLevel('silly', 'error')).toBe(false);
    expect(isAtLeastLevel('debug', 'warn')).toBe(false);
    expect(isAtLeastLevel('info', 'error')).toBe(false);
  });

  it('returns true when level equals the minimum', () => {
    expect(isAtLeastLevel('warn', 'warn')).toBe(true);
    expect(isAtLeastLevel('error', 'error')).toBe(true);
  });

  it('treats error as the highest severity, matching only itself and above', () => {
    expect(isAtLeastLevel('error', 'error')).toBe(true);
    expect(isAtLeastLevel('warn', 'error')).toBe(false);
  });
});
