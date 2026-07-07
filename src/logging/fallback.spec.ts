import { fallbackLog, logLoggingFailure } from './fallback';

describe('logging/fallback', () => {
  const writeSpy = jest.spyOn(process.stderr, 'write');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    writeSpy.mockRestore();
  });

  it('logs errors with message and stack when passed an Error', () => {
    const error = new Error('boom');

    fallbackLog('error', error);

    const output = writeSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('[ERROR] [FALLBACK]');
    expect(output).toContain('boom');
    expect(output).toContain(error.stack as string);
  });

  it('stringifies objects and joins values with spaces', () => {
    fallbackLog('debug', 'hello', { key: 'value' }, 123);

    const output = writeSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('[DEBUG] [FALLBACK]');
    expect(output).toContain('hello');
    expect(output).toContain('{"key":"value"}');
    expect(output).toContain('123');
  });

  it('falls back to String() when object serialization fails', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    fallbackLog('info', circular);

    const output = writeSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('[INFO] [FALLBACK]');
    expect(output).toContain('[object Object]');
  });

  it('swallows any internal fallback logging errors', () => {
    writeSpy.mockImplementation(() => {
      throw new Error('stderr failed');
    });

    expect(() => fallbackLog('error', 'boom')).not.toThrow();
  });

  it('formats logLoggingFailure consistently', () => {
    logLoggingFailure(new Error('denied'), 'media-access');

    const output = writeSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('[ERROR] [FALLBACK]');
    expect(output).toContain('Logging failed in media-access:');
    expect(output).toContain('denied');
  });

  it('stringifies non-error failures consistently', () => {
    logLoggingFailure('kaboom', 'media-access');

    const output = writeSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('[ERROR] [FALLBACK]');
    expect(output).toContain('Logging failed in media-access:');
    expect(output).toContain('kaboom');
  });
});
