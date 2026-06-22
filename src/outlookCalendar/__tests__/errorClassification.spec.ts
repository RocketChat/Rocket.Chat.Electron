import {
  classifyError,
  createClassifiedError,
  formatErrorForLogging,
  generateUserFriendlyMessage,
} from '../errorClassification';

describe('classifyError', () => {
  describe('pattern matching by message string', () => {
    it.each<[string, string]>([
      [
        "Cannot read properties of undefined (reading 'headers')",
        'EWS_NTLM_AUTH_FAILED',
      ],
      [
        'The remote server returned an error: (401) Unauthorized',
        'EWS_UNAUTHORIZED',
      ],
      [
        'The remote server returned an error: (404) Not Found',
        'EWS_SERVER_NOT_FOUND',
      ],
      ['getaddrinfo ENOTFOUND mail.example.com', 'NETWORK_CONNECTION_FAILED'],
      ['connect ECONNREFUSED 10.0.0.1:443', 'NETWORK_CONNECTION_FAILED'],
      ['socket hang up due to timeout', 'NETWORK_CONNECTION_FAILED'],
      ['SSL_ERROR_BAD_CERT_DOMAIN', 'SSL_CERTIFICATE_ERROR'],
      ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SSL_CERTIFICATE_ERROR'],
      ['CERT_HAS_EXPIRED', 'SSL_CERTIFICATE_ERROR'],
      ['ERR_TLS_CERT_ALTNAME_INVALID', 'SSL_CERTIFICATE_ERROR'],
      ['self-signed certificate in chain', 'SSL_CERTIFICATE_ERROR'],
      ['certificate has expired', 'SSL_CERTIFICATE_ERROR'],
      [
        'Request failed with status code 401 from rocket.chat server',
        'RC_UNAUTHORIZED',
      ],
      [
        'Request failed with status code 500 from rocket.chat server',
        'RC_SERVER_ERROR',
      ],
      ['calendar is not enabled on this workspace', 'RC_CALENDAR_DISABLED'],
      ['the calendar feature is disabled', 'RC_CALENDAR_DISABLED'],
      ['Missing required Outlook credentials', 'MISSING_CREDENTIALS'],
      ['Failed to decrypt credentials', 'CREDENTIAL_DECRYPTION_FAILED'],
      ['Invalid Exchange server URL configuration', 'INVALID_EXCHANGE_URL'],
      ['NTLM authentication failed for user', 'NTLM_AUTH_FAILED'],
    ])('classifies %j as %s', (message, expectedCode) => {
      expect(classifyError(message).code).toBe(expectedCode);
    });
  });

  it('matches patterns case-insensitively', () => {
    expect(
      classifyError('THE REMOTE SERVER RETURNED AN ERROR: (401) UNAUTHORIZED')
        .code
    ).toBe('EWS_UNAUTHORIZED');
  });

  it('accepts an Error instance and reads its message', () => {
    const result = classifyError(
      new Error('Missing required Outlook credentials')
    );
    expect(result.code).toBe('MISSING_CREDENTIALS');
    expect(result.source).toBe('desktop_app');
    expect(result.severity).toBe('medium');
  });

  it('matches against the Error stack as well as the message', () => {
    const error = new Error('wrapper failure');
    error.stack = 'Error: wrapper failure\n  at x getaddrinfo ENOTFOUND host\n';
    expect(classifyError(error).code).toBe('NETWORK_CONNECTION_FAILED');
  });

  it('returns the UNKNOWN_ERROR fallback for unmatched input', () => {
    const result = classifyError('something totally unrelated happened');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.source).toBe('desktop_app');
    expect(result.severity).toBe('medium');
    expect(result.suggestedActions).toEqual(
      expect.arrayContaining(['Try the operation again'])
    );
  });

  it('returns the expected classification shape including suggestedActions', () => {
    const result = classifyError(
      'The remote server returned an error: (404) Not Found'
    );
    expect(result.source).toBe('exchange');
    expect(result.severity).toBe('high');
    expect(Array.isArray(result.suggestedActions)).toBe(true);
    expect(result.suggestedActions!.length).toBeGreaterThan(0);
  });

  it('prefers the first matching pattern when multiple could match', () => {
    // 401 + rocket.chat: the EWS 401 pattern appears earlier in the list
    const result = classifyError(
      'The remote server returned an error: (401) Unauthorized from rocket.chat'
    );
    expect(result.code).toBe('EWS_UNAUTHORIZED');
  });
});

describe('createClassifiedError', () => {
  it('wraps classification with technical message, timestamp and context', () => {
    const error = new Error('Failed to decrypt credentials');
    const result = createClassifiedError(error, { userId: 'abc' });

    expect(result.code).toBe('CREDENTIAL_DECRYPTION_FAILED');
    expect(result.technicalMessage).toBe('Failed to decrypt credentials');
    expect(result.context.userId).toBe('abc');
    expect(typeof result.timestamp).toBe('string');
    expect(result.context.timestamp).toBe(result.timestamp);
    expect(result.context.stack).toBe(error.stack);
  });

  it('handles a string error with undefined stack in context', () => {
    const result = createClassifiedError(
      'Missing required Outlook credentials'
    );
    expect(result.technicalMessage).toBe(
      'Missing required Outlook credentials'
    );
    expect(result.context.stack).toBeUndefined();
  });

  it('defaults context to an empty object', () => {
    const result = createClassifiedError('unmatched message');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.context).toBeDefined();
  });
});

describe('formatErrorForLogging', () => {
  it('renders source, severity, code, messages and actions', () => {
    const classified = createClassifiedError(
      'The remote server returned an error: (401) Unauthorized',
      { server: 'mail.example.com' }
    );
    const out = formatErrorForLogging(classified, 'syncEvents');

    expect(out).toContain('[OutlookCalendar] syncEvents failed');
    expect(out).toContain('EXCHANGE ERROR');
    expect(out).toContain('Source: exchange');
    expect(out).toContain('Severity: high');
    expect(out).toContain('Code: EWS_UNAUTHORIZED');
    expect(out).toContain('mail.example.com');
    expect(out).toContain('Suggested Actions:');
  });

  it('redacts sensitive context keys', () => {
    const classified = createClassifiedError('unmatched', {
      password: 'hunter2',
      token: 'abc',
      accessToken: 'xyz',
      cookie: 'c',
      authorization: 'Bearer z',
      secret: 's',
      safeField: 'visible',
    });
    const out = formatErrorForLogging(classified, 'op');

    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('Bearer z');
    expect(out).toContain('visible');
  });

  it('redacts sensitive keys nested in objects and arrays', () => {
    const classified = createClassifiedError('unmatched', {
      nested: { password: 'p', ok: 1 },
      list: [{ secret: 's', keep: 2 }],
    });
    const out = formatErrorForLogging(classified, 'op');
    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('"p"');
    expect(out).not.toContain('"s"');
    expect(out).toContain('"keep": 2');
  });

  it('handles circular references in context without throwing', () => {
    const circular: Record<string, unknown> = { name: 'root' };
    circular.self = circular;
    const arr: unknown[] = [];
    arr.push(arr);
    circular.arr = arr;

    const classified = createClassifiedError('unmatched', circular);
    let out = '';
    expect(() => {
      out = formatErrorForLogging(classified, 'op');
    }).not.toThrow();
    expect(out).toContain('[Circular]');
  });

  it('falls back to a default suggested action when none present', () => {
    const classified = createClassifiedError('unmatched');
    classified.suggestedActions = undefined;
    const out = formatErrorForLogging(classified, 'op');
    expect(out).toContain('Contact support');
  });
});

describe('generateUserFriendlyMessage', () => {
  it.each<
    [
      (
        | 'exchange'
        | 'rocket_chat'
        | 'desktop_app'
        | 'network'
        | 'authentication'
        | 'configuration'
      ),
      string,
    ]
  >([
    ['exchange', 'Exchange Server'],
    ['rocket_chat', 'Rocket.Chat Server'],
    ['desktop_app', 'Desktop Application'],
    ['network', 'Network Connection'],
    ['authentication', 'Authentication'],
    ['configuration', 'Configuration'],
  ])('maps source %s to label %s', (source, label) => {
    const message = generateUserFriendlyMessage({
      source,
      severity: 'medium',
      code: 'X',
      technicalMessage: 't',
      userMessage: 'A problem occurred.',
      context: {},
      timestamp: 'now',
      suggestedActions: ['Do thing'],
    });
    expect(message).toContain(`${label} Error: A problem occurred.`);
    expect(message).toContain('What you can try:');
    expect(message).toContain('• Do thing');
  });

  it('falls back to Unknown Source for an unexpected source value', () => {
    const message = generateUserFriendlyMessage({
      source: 'something_else' as never,
      severity: 'low',
      code: 'X',
      technicalMessage: 't',
      userMessage: 'msg',
      context: {},
      timestamp: 'now',
    });
    expect(message).toContain('Unknown Source Error: msg');
  });

  it('omits the actions block when there are no suggested actions', () => {
    const message = generateUserFriendlyMessage({
      source: 'network',
      severity: 'low',
      code: 'X',
      technicalMessage: 't',
      userMessage: 'msg',
      context: {},
      timestamp: 'now',
      suggestedActions: [],
    });
    expect(message).toBe('Network Connection Error: msg');
    expect(message).not.toContain('What you can try:');
  });
});
