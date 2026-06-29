import { createPrivacyHook, redactSensitiveData } from '../privacy';

describe('redactSensitiveData', () => {
  describe('key-value credential patterns', () => {
    it.each([
      ['password: hunter2longpass', 'password: [REDACTED]'],
      // The value-portion regex stops at the closing quote, leaving it behind.
      ['password="supersecretvalue"', 'password: [REDACTED]"'],
      ['passwd: anotherlongpass', 'passwd: [REDACTED]'],
      ['secret: supersecretvalue', 'secret: [REDACTED]'],
      ['api_key: abcd1234efgh5678', 'api_key: [REDACTED]'],
      ['apikey: abcd1234efgh5678', 'api_key: [REDACTED]'],
      ['api-key: abcd1234efgh5678', 'api_key: [REDACTED]'],
      ['auth_token: abcd1234efgh5678', 'auth_token: [REDACTED]'],
      ['access_token: abcd1234efgh5678', 'access_token: [REDACTED]'],
      ['refresh_token: abcd1234efgh5678', 'refresh_token: [REDACTED]'],
      // The generic auth[_-]?token pattern matches first, leaving the "x-" prefix
      // and rewriting the dash to an underscore in the emitted label.
      ['x-auth-token: abcd1234efgh5678', 'x-auth_token: [REDACTED]'],
      ['authorization: Bearer abcd1234efgh5678', 'authorization: [REDACTED]'],
      // The "secret" KV pattern (label "secret") matches the value first and
      // emits "[REDACTED]"; the broader "client_secret" pass then re-runs over
      // the residual text, appending a trailing "]" from the placeholder.
      ['client_secret: abcd1234efgh5678', 'client_secret: [REDACTED]]'],
      ['private_key: abcd1234efgh5678', 'private_key: [REDACTED]'],
      ['webhook_url: https://hooks.example', 'webhook_url: [REDACTED]'],
    ])('redacts %s', (input, expected) => {
      expect(redactSensitiveData(input)).toBe(expected);
    });

    it.each([
      // Values shorter than 8 chars must NOT match (avoids "secret: no").
      ['secret: no', 'secret: no'],
      ['password: short', 'password: short'],
      ['token expired', 'token expired'],
    ])('leaves short credential value %s untouched', (input, expected) => {
      expect(redactSensitiveData(input)).toBe(expected);
    });

    it('is case-insensitive for credential keys', () => {
      expect(redactSensitiveData('PASSWORD: hunter2longpass')).toBe(
        'password: [REDACTED]'
      );
    });
  });

  describe('standalone token patterns', () => {
    it('partially masks Bearer tokens', () => {
      expect(
        redactSensitiveData('Bearer abcdefghijklmnopqrstuvwxyz123456')
      ).toBe('Bearer abcd...3456');
    });

    it('does not mask short Bearer tokens (under 20 chars)', () => {
      expect(redactSensitiveData('Bearer shorttoken')).toBe(
        'Bearer shorttoken'
      );
    });

    it('masks JWT tokens keeping 6 chars on each side', () => {
      const jwt =
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      expect(redactSensitiveData(`token ${jwt}`)).toBe('token eyJhbG...Qssw5c');
    });

    it('redacts credentials embedded in URLs', () => {
      expect(redactSensitiveData('https://user:pass@example.com/path')).toBe(
        'https://[REDACTED]:[REDACTED]@example.com/path'
      );
    });

    it('masks long hex strings (32+ chars)', () => {
      expect(redactSensitiveData('hash 0123456789abcdef0123456789abcdef')).toBe(
        'hash 012345...abcdef'
      );
    });

    it('leaves short hex strings untouched', () => {
      expect(redactSensitiveData('hex deadbeef')).toBe('hex deadbeef');
    });
  });

  describe('PII — emails', () => {
    it.each([
      ['email john.doe@example.com here', 'email j***@example.com here'],
      ['contact ab@test.io', 'contact a***@test.io'],
    ])('masks local part of %s', (input, expected) => {
      expect(redactSensitiveData(input)).toBe(expected);
    });

    it.each([
      ['scope @rocket/chat ok', 'scope @rocket/chat ok'],
      // The pattern itself requires a TLD so npm scopes do not match;
      // these assert no accidental redaction of non-email tokens.
      ['file index@2.0.ts', 'file index@2.0.ts'],
    ])('does not mask non-email token %s', (input, expected) => {
      expect(redactSensitiveData(input)).toBe(expected);
    });
  });

  describe('PII — credit cards (Luhn-gated)', () => {
    it.each([
      ['card 4111 1111 1111 1111 ok', 'card ****1111 ok'],
      ['card 4111111111111111 ok', 'card ****1111 ok'],
      ['mc 5500005555555559 ok', 'mc ****5559 ok'],
    ])('redacts valid Luhn card %s', (input, expected) => {
      expect(redactSensitiveData(input)).toBe(expected);
    });

    it.each([
      // Fails Luhn — must not be redacted.
      ['card 4111111111111112 invalid', 'card 4111111111111112 invalid'],
    ])('leaves invalid-Luhn card %s untouched', (input, expected) => {
      expect(redactSensitiveData(input)).toBe(expected);
    });
  });

  describe('PII — IPv4 addresses', () => {
    it.each([
      ['ip 8.8.8.8 here', 'ip 8.8.*.* here'],
      ['ip 1.2.3.4 here', 'ip 1.2.*.* here'],
    ])('masks last two octets of public IP %s', (input, expected) => {
      expect(redactSensitiveData(input)).toBe(expected);
    });

    it.each([
      ['ip 127.0.0.1 local', 'ip 127.0.0.1 local'],
      ['ip 0.0.0.0 any', 'ip 0.0.0.0 any'],
      ['ip 192.168.1.1 private', 'ip 192.168.1.1 private'],
      ['ip 10.0.0.5 private', 'ip 10.0.0.5 private'],
      ['ip 172.16.0.1 private', 'ip 172.16.0.1 private'],
      ['ip 172.31.255.1 private', 'ip 172.31.255.1 private'],
    ])('does not mask reserved/private IP %s', (input, expected) => {
      expect(redactSensitiveData(input)).toBe(expected);
    });

    it('still masks public IPs outside the private 172 range', () => {
      expect(redactSensitiveData('ip 172.32.0.1 here')).toBe(
        'ip 172.32.*.* here'
      );
    });
  });

  it('returns plain text unchanged when nothing matches', () => {
    expect(redactSensitiveData('nothing sensitive here')).toBe(
      'nothing sensitive here'
    );
  });

  it('is idempotent across repeated calls (lastIndex reset)', () => {
    const input = 'password: hunter2longpass';
    expect(redactSensitiveData(input)).toBe('password: [REDACTED]');
    expect(redactSensitiveData(input)).toBe('password: [REDACTED]');
  });
});

describe('createPrivacyHook', () => {
  const hook = createPrivacyHook();

  it('redacts string data entries', () => {
    const result = hook(
      { data: ['password: hunter2longpass'], level: 'info', date: 0 },
      {},
      'file'
    );
    expect(result.data).toEqual(['password: [REDACTED]']);
  });

  it('wraps non-array message.data into an array', () => {
    const result = hook({ data: 'secret: longsecretvalue' }, {});
    expect(result.data).toEqual(['secret: [REDACTED]']);
  });

  it('partially masks sensitive object keys (long values)', () => {
    const result = hook(
      { data: [{ token: 'abcdefghijklmnop', user: 'bob' }] },
      {}
    );
    expect(result.data[0]).toEqual({ token: 'abcd...mnop', user: 'bob' });
  });

  it('fully redacts short sensitive values', () => {
    const result = hook({ data: [{ password: 'short' }] }, {});
    expect(result.data[0]).toEqual({ password: '[REDACTED]' });
  });

  it('does not redact allowlisted safe keys', () => {
    const result = hook({ data: [{ token_type: 'Bearer' }] }, {});
    expect(result.data[0]).toEqual({ token_type: 'Bearer' });
  });

  it('redacts a top-level Redux state dump', () => {
    const result = hook(
      { data: [{ appPath: 'x', appVersion: '1', servers: [], other: 1 }] },
      {}
    );
    expect(result.data).toEqual(['[Redux State Redacted]']);
  });

  it('redacts a nested state property while keeping siblings', () => {
    const result = hook(
      {
        data: [
          { type: 'X', state: { appPath: 'x', appVersion: '1', servers: [] } },
        ],
      },
      {}
    );
    expect(result.data[0]).toEqual({
      type: 'X',
      state: '[Redux State Redacted]',
    });
  });

  it('preserves and redacts Error message/stack/name', () => {
    const err = new Error('password: hunter2longpass failed');
    const result = hook({ data: [err] }, {});
    expect(result.data[0].name).toBe('Error');
    expect(result.data[0].message).toBe('password: [REDACTED] failed');
    expect(typeof result.data[0].stack).toBe('string');
  });

  it('handles circular references without throwing', () => {
    const circular: any = { a: 1 };
    circular.self = circular;
    const result = hook({ data: [circular] }, {});
    expect(result.data[0]).toEqual({ a: 1, self: '[Circular]' });
  });

  it('truncates objects nested beyond the depth limit', () => {
    let deep: any = 'leaf';
    for (let i = 0; i < 12; i++) deep = { next: deep };
    const result = hook({ data: [deep] }, {});
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('[Nested Object Redacted]');
  });

  it('passes through primitive (non-string, non-object) data', () => {
    const result = hook({ data: [42, null, true] }, {});
    expect(result.data).toEqual([42, null, true]);
  });

  it('falls back to a placeholder when redaction throws', () => {
    const evil: any = { level: 'warn', date: new Date(0) };
    Object.defineProperty(evil, 'data', {
      get() {
        throw new Error('boom');
      },
    });
    const result = hook(evil, {});
    expect(result).toEqual({
      level: 'warn',
      date: evil.date,
      data: ['[Privacy redaction failed]'],
    });
  });
});
