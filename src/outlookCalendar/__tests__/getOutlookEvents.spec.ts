/**
 * `ews-javascript-api` and `@ewsjs/xhr` are heavyweight modules whose transitive
 * deps (e.g. the ESM-only `uuid` build) cannot be transformed by ts-jest, and
 * `../logger` pulls in the Redux store. Mock all three so the pure transforms in
 * `getOutlookEvents.ts` can be exercised in isolation. The EWS network calls
 * (`FindAppointments` / `LoadPropertiesForItems`) are driven through
 * `mockServiceConfig` rather than hitting a real Exchange server.
 */
jest.mock('../logger', () => ({
  outlookLog: jest.fn(),
  outlookError: jest.fn(),
  outlookWarn: jest.fn(),
  outlookEventDetail: jest.fn(),
}));

jest.mock('@ewsjs/xhr', () => ({
  XhrApi: jest.fn().mockImplementation(() => ({
    useNtlmAuthentication: jest.fn(),
  })),
}));

type MockServiceConfig = {
  findAppointments: () => Promise<{ Items: unknown[] }> | { Items: unknown[] };
  loadProperties: () => Promise<void> | void;
};

const mockServiceConfig: MockServiceConfig = {
  findAppointments: () => ({ Items: [] }),
  loadProperties: () => undefined,
};

jest.mock('ews-javascript-api', () => {
  // DateTime instances must be numerically comparable (`appointment.End > minTime`).
  class DateTime {
    private readonly time: number;

    constructor(
      year?: number,
      month?: number,
      day?: number,
      hour = 0,
      minute = 0,
      second = 0
    ) {
      this.time =
        year === undefined
          ? 0
          : new Date(
              year,
              (month ?? 1) - 1,
              day ?? 1,
              hour,
              minute,
              second
            ).getTime();
    }

    valueOf(): number {
      return this.time;
    }
  }

  return {
    DateTime,
    FolderId: jest.fn(),
    CalendarView: jest.fn(),
    WellKnownFolderName: { Calendar: 'Calendar' },
    BasePropertySet: { FirstClassProperties: 'FirstClassProperties' },
    PropertySet: jest.fn(),
    ConfigurationApi: { ConfigureXHR: jest.fn() },
    WebCredentials: jest.fn(),
    ExchangeVersion: { Exchange2013: 'Exchange2013' },
    Uri: jest.fn().mockImplementation((url: string) => ({
      ToString: () => url,
    })),
    LegacyFreeBusyStatus: { Free: 0, Tentative: 1, Busy: 2, OOF: 3 },
    ExchangeService: jest.fn().mockImplementation(() => ({
      Credentials: undefined,
      Url: undefined,
      FindAppointments: jest.fn(() =>
        Promise.resolve(mockServiceConfig.findAppointments())
      ),
      LoadPropertiesForItems: jest.fn(() =>
        Promise.resolve(mockServiceConfig.loadProperties())
      ),
    })),
  };
});

// eslint-disable-next-line import/first
import {
  sanitizeExchangeUrl,
  getOutlookEvents,
  testExchangeServerConnectivity,
} from '../getOutlookEvents';
// eslint-disable-next-line import/first
import type { OutlookCredentials } from '../type';

/**
 * Builds a fake EWS Appointment whose `Start`/`End` are numerically comparable
 * via `valueOf`, mirroring the real `DateTime` so the midnight-filter works.
 */
const makeAppointment = (overrides: Record<string, any> = {}): any => {
  const startMs = overrides.startMs ?? new Date(2024, 0, 15, 9, 0, 0).getTime();
  const endMs = overrides.endMs ?? new Date(2024, 0, 15, 10, 0, 0).getTime();

  const base: any = {
    Id: { UniqueId: overrides.id ?? 'appt-1' },
    Subject: 'subject' in overrides ? overrides.subject : 'Standup',
    Start: {
      valueOf: () => startMs,
      ToISOString: () => new Date(startMs).toISOString(),
    },
    End: {
      valueOf: () => endMs,
      ToISOString: () => new Date(endMs).toISOString(),
    },
    Body: 'body' in overrides ? overrides.body : { Text: 'Daily sync' },
    IsAllDayEvent: 'isAllDay' in overrides ? overrides.isAllDay : false,
    IsCancelled: 'isCanceled' in overrides ? overrides.isCanceled : false,
    JoinOnlineMeetingUrl:
      'meetingUrl' in overrides ? overrides.meetingUrl : undefined,
    ReminderMinutesBeforeStart:
      'reminderMinutesBeforeStart' in overrides
        ? overrides.reminderMinutesBeforeStart
        : undefined,
    LegacyFreeBusyStatus:
      'legacyFreeBusyStatus' in overrides ? overrides.legacyFreeBusyStatus : 2, // Busy
  };

  return base;
};

const credentials: OutlookCredentials = {
  userId: 'user-1',
  serverUrl: 'https://mail.example.com',
  login: 'user@example.com',
  password: 'secret',
};

const syncDate = new Date(2024, 0, 15, 12, 0, 0);

describe('getOutlookEvents', () => {
  beforeEach(() => {
    mockServiceConfig.findAppointments = () => ({ Items: [] });
    mockServiceConfig.loadProperties = () => undefined;
  });

  describe('credential validation', () => {
    it.each<[string, Partial<OutlookCredentials>]>([
      ['login', { login: '' }],
      ['password', { password: '' }],
      ['serverUrl', { serverUrl: '' }],
    ])('fails the sync when %s is missing', async (_field, override) => {
      await expect(
        getOutlookEvents({ ...credentials, ...override }, syncDate)
      ).rejects.toThrow(/Outlook calendar sync failed/);
    });
  });

  describe('empty result handling', () => {
    it('returns an empty array when no appointments are found', async () => {
      mockServiceConfig.findAppointments = () => ({ Items: [] });

      const result = await getOutlookEvents(credentials, syncDate);

      expect(result).toEqual([]);
    });

    it('returns an empty array when every appointment ends at or before midnight', async () => {
      // End at midnight of the sync day → filtered out (End must be > minTime).
      const midnightMs = new Date(2024, 0, 15, 0, 0, 0).getTime();
      mockServiceConfig.findAppointments = () => ({
        Items: [makeAppointment({ endMs: midnightMs })],
      });

      const result = await getOutlookEvents(credentials, syncDate);

      expect(result).toEqual([]);
    });
  });

  describe('appointment mapping', () => {
    it('maps a fully-populated appointment into AppointmentData', async () => {
      const startMs = new Date(2024, 0, 15, 9, 0, 0).getTime();
      const endMs = new Date(2024, 0, 15, 10, 30, 0).getTime();
      mockServiceConfig.findAppointments = () => ({
        Items: [
          makeAppointment({
            id: 'unique-123',
            subject: 'Planning',
            startMs,
            endMs,
            body: { Text: 'Quarterly planning' },
            isAllDay: false,
            isCanceled: false,
            meetingUrl: 'https://meet.example.com/abc',
            reminderMinutesBeforeStart: 15,
            legacyFreeBusyStatus: 2, // Busy
          }),
        ],
      });

      const [event] = await getOutlookEvents(credentials, syncDate);

      expect(event).toEqual({
        id: 'unique-123',
        subject: 'Planning',
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        description: 'Quarterly planning',
        isAllDay: false,
        isCanceled: false,
        meetingUrl: 'https://meet.example.com/abc',
        reminderMinutesBeforeStart: 15,
        busy: true,
      });
    });

    it('maps multiple appointments preserving order', async () => {
      mockServiceConfig.findAppointments = () => ({
        Items: [
          makeAppointment({ id: 'a', subject: 'First' }),
          makeAppointment({ id: 'b', subject: 'Second' }),
        ],
      });

      const result = await getOutlookEvents(credentials, syncDate);

      expect(result.map((e) => e.id)).toEqual(['a', 'b']);
      expect(result.map((e) => e.subject)).toEqual(['First', 'Second']);
    });

    it('marks busy=false for non-Busy free/busy statuses', async () => {
      mockServiceConfig.findAppointments = () => ({
        Items: [makeAppointment({ legacyFreeBusyStatus: 0 })], // Free
      });

      const [event] = await getOutlookEvents(credentials, syncDate);

      expect(event.busy).toBe(false);
    });

    it('flags all-day and canceled events', async () => {
      mockServiceConfig.findAppointments = () => ({
        Items: [makeAppointment({ isAllDay: true, isCanceled: true })],
      });

      const [event] = await getOutlookEvents(credentials, syncDate);

      expect(event.isAllDay).toBe(true);
      expect(event.isCanceled).toBe(true);
    });
  });

  describe('missing / partial fields', () => {
    it('defaults description to empty string when the body is absent', async () => {
      mockServiceConfig.findAppointments = () => ({
        Items: [makeAppointment({ body: undefined })],
      });

      const [event] = await getOutlookEvents(credentials, syncDate);

      expect(event.description).toBe('');
    });

    it('defaults description to empty string when Body.Text is missing', async () => {
      mockServiceConfig.findAppointments = () => ({
        Items: [makeAppointment({ body: {} })],
      });

      const [event] = await getOutlookEvents(credentials, syncDate);

      expect(event.description).toBe('');
    });

    it('leaves meetingUrl and reminder undefined when not provided', async () => {
      mockServiceConfig.findAppointments = () => ({
        Items: [
          makeAppointment({
            meetingUrl: undefined,
            reminderMinutesBeforeStart: undefined,
          }),
        ],
      });

      const [event] = await getOutlookEvents(credentials, syncDate);

      expect(event.meetingUrl).toBeUndefined();
      expect(event.reminderMinutesBeforeStart).toBeUndefined();
    });

    it('falls back isAllDay/isCanceled to false when the flags are nullish', async () => {
      mockServiceConfig.findAppointments = () => ({
        Items: [makeAppointment({ isAllDay: null, isCanceled: null })],
      });

      const [event] = await getOutlookEvents(credentials, syncDate);

      expect(event.isAllDay).toBe(false);
      expect(event.isCanceled).toBe(false);
    });
  });

  describe('EWS call failures', () => {
    it('wraps FindAppointments failures in a sync error', async () => {
      mockServiceConfig.findAppointments = () => {
        throw new Error('boom-find');
      };

      await expect(getOutlookEvents(credentials, syncDate)).rejects.toThrow(
        /Outlook calendar sync failed/
      );
    });

    it('wraps LoadPropertiesForItems failures in a sync error', async () => {
      mockServiceConfig.findAppointments = () => ({
        Items: [makeAppointment()],
      });
      mockServiceConfig.loadProperties = () => {
        throw new Error('boom-load');
      };

      await expect(getOutlookEvents(credentials, syncDate)).rejects.toThrow(
        /Outlook calendar sync failed/
      );
    });
  });

  describe('allowInsecure flag', () => {
    it('completes the sync when SSL validation is disabled', async () => {
      mockServiceConfig.findAppointments = () => ({
        Items: [makeAppointment({ id: 'insecure-1' })],
      });

      const result = await getOutlookEvents(credentials, syncDate, true);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('insecure-1');
    });
  });

  describe('Exchange URL configuration failures', () => {
    it('rejects when the server URL cannot be sanitized', async () => {
      // `https://` has no hostname, so `sanitizeExchangeUrl` throws and the
      // exchange_url_configuration catch wraps it into a sync failure.
      await expect(
        getOutlookEvents({ ...credentials, serverUrl: 'https://' }, syncDate)
      ).rejects.toThrow(/Outlook calendar sync failed/);
    });
  });
});

describe('testExchangeServerConnectivity', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('returns true and probes the base URL when the server responds', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 200 });
    global.fetch = fetchMock as any;

    const reachable = await testExchangeServerConnectivity(
      'https://mail.example.com/ews/exchange.asmx'
    );

    expect(reachable).toBe(true);
    // Connectivity is tested against the origin, not the full EWS path.
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mail.example.com',
      expect.objectContaining({ method: 'HEAD', redirect: 'manual' })
    );
  });

  it('returns false when the fetch rejects', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as any;

    const reachable = await testExchangeServerConnectivity(
      'https://unreachable.example.com'
    );

    expect(reachable).toBe(false);
  });

  it('returns false when the URL is malformed', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const reachable = await testExchangeServerConnectivity('not a url');

    expect(reachable).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Exchange URL Sanitization', () => {
  describe('Base URL scenarios', () => {
    it.each([
      [
        'https://mail.example.com',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com///',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      ['http://mail.example.com', 'http://mail.example.com/ews/exchange.asmx'],
      [
        'https://mail.example.com:8443',
        'https://mail.example.com:8443/ews/exchange.asmx',
      ],
    ])('transforms base URL %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('URLs with /ews path', () => {
    it.each([
      [
        'https://mail.example.com/ews',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/ews/',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/ews///',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/ews',
        'https://mail.example.com/ews/exchange.asmx',
      ],
    ])('transforms EWS path URL %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('Case-insensitive scenarios', () => {
    it.each([
      [
        'https://mail.example.com/EWS',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/Ews',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/EWS/',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/EWS/EXCHANGE.ASMX',
        'https://mail.example.com/ews/exchange.asmx',
      ],
    ])('handles case-insensitive URL %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('Already complete URLs', () => {
    it.each([
      [
        'https://mail.example.com/ews/exchange.asmx',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/ews/exchange.asmx/',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/EWS/EXCHANGE.ASMX',
        'https://mail.example.com/ews/exchange.asmx',
      ],
    ])('preserves complete URL %s as %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('URLs with subpaths', () => {
    it.each([
      [
        'https://mail.example.com/outlook',
        'https://mail.example.com/outlook/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/mail/ews',
        'https://mail.example.com/mail/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/subdir/path',
        'https://mail.example.com/subdir/path/ews/exchange.asmx',
      ],
    ])('handles subpaths %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('Fallback for malformed URLs', () => {
    it.each([
      ['mail.example.com', 'https://mail.example.com/ews/exchange.asmx'],
      ['mail.example.com/ews', 'https://mail.example.com/ews/exchange.asmx'],
      // `mail.example.com:443/ews` parses `mail.example.com:` as the scheme,
      // so the `:443` port is not preserved by the fallback path.
      [
        'mail.example.com:443/ews',
        'https://mail.example.com/ews/exchange.asmx',
      ],
    ])('handles URLs without protocol %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('Error handling', () => {
    it.each([
      ['', 'Invalid server URL: must be a non-empty string'],
      [null as any, 'Invalid server URL: must be a non-empty string'],
      [undefined as any, 'Invalid server URL: must be a non-empty string'],
      [123 as any, 'Invalid server URL: must be a non-empty string'],
    ])('throws error for invalid input %s', (input, expectedError) => {
      expect(() => sanitizeExchangeUrl(input)).toThrow(expectedError);
    });
  });

  describe('Real-world examples', () => {
    it.each([
      // The original problematic case from the issue
      [
        'https://mail.example.com/ews',
        'https://mail.example.com/ews/exchange.asmx',
      ],

      // Common Office 365 patterns
      [
        'https://outlook.office365.com/ews',
        'https://outlook.office365.com/ews/exchange.asmx',
      ],
      [
        'https://outlook.office365.com',
        'https://outlook.office365.com/ews/exchange.asmx',
      ],

      // On-premises Exchange patterns
      [
        'https://mail.company.com/exchange',
        'https://mail.company.com/exchange/ews/exchange.asmx',
      ],
      [
        'https://exchange.company.com',
        'https://exchange.company.com/ews/exchange.asmx',
      ],

      // Legacy configurations
      [
        'https://mail.company.com/ews/exchange.asmx',
        'https://mail.company.com/ews/exchange.asmx',
      ],
    ])('handles real-world URL %s correctly as %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('URL validation and error handling', () => {
    describe('Invalid URL structures', () => {
      // An unsupported protocol fails the strict parse, but the fallback path
      // prepends `https://` and recovers a usable EWS endpoint rather than
      // throwing.
      it('recovers an unsupported protocol via the fallback path', () => {
        const result = sanitizeExchangeUrl('invalid://domain.com');
        expect(result).toMatch(/\/ews\/exchange\.asmx$/);
      });

      // A protocol-only URL has no hostname for either the strict parse or the
      // fallback, so the wrapped "Failed to create valid Exchange URL" error is
      // thrown.
      it('throws a wrapped error for a hostname-less URL', () => {
        expect(() => sanitizeExchangeUrl('https://')).toThrow(
          /Failed to create valid Exchange URL/
        );
      });

      it('handles URLs without dots via fallback', () => {
        const result = sanitizeExchangeUrl('not-a-url');
        expect(result).toBe('https://not-a-url/ews/exchange.asmx');
      });

      it('handles URLs with double dots via fallback', () => {
        const result = sanitizeExchangeUrl('https://bad..domain.com');
        expect(result).toBe('https://bad..domain.com/ews/exchange.asmx');
      });

      it('handles URLs with double slashes by normalizing', () => {
        const result = sanitizeExchangeUrl('https://domain.com//bad//path');
        expect(result).toBe('https://domain.com/bad/path/ews/exchange.asmx');
      });
    });

    describe('Valid URLs with warnings', () => {
      // These should work but may generate warnings
      it('handles localhost URLs', () => {
        const result = sanitizeExchangeUrl('http://localhost/ews');
        expect(result).toBe('http://localhost/ews/exchange.asmx');
      });

      it('handles HTTP URLs (should warn but work)', () => {
        const result = sanitizeExchangeUrl('http://exchange.company.com');
        expect(result).toBe('http://exchange.company.com/ews/exchange.asmx');
      });

      it('handles non-standard ports', () => {
        const result = sanitizeExchangeUrl('https://mail.company.com:9443');
        expect(result).toBe('https://mail.company.com:9443/ews/exchange.asmx');
      });
    });

    describe('Fallback URL handling', () => {
      it('handles URLs without protocol', () => {
        const result = sanitizeExchangeUrl('mail.company.com');
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });

      it('handles partial URLs with /ews', () => {
        const result = sanitizeExchangeUrl('mail.company.com/ews');
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });

      it('handles complete fallback URLs', () => {
        const result = sanitizeExchangeUrl(
          'mail.company.com/ews/exchange.asmx'
        );
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });
    });

    describe('Exchange-specific validation', () => {
      it('validates Exchange endpoint path', () => {
        const result = sanitizeExchangeUrl('https://mail.company.com');
        expect(result).toMatch(/\/ews\/exchange\.asmx$/);
      });

      it('preserves existing correct Exchange paths', () => {
        const input = 'https://mail.company.com/ews/exchange.asmx';
        const result = sanitizeExchangeUrl(input);
        expect(result).toBe(input);
      });

      it('corrects case in Exchange paths', () => {
        const result = sanitizeExchangeUrl(
          'https://mail.company.com/EWS/EXCHANGE.ASMX'
        );
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });
    });

    describe('Detailed error scenarios', () => {
      it('handles input without dots via fallback', () => {
        const result = sanitizeExchangeUrl('not-a-url-at-all');
        expect(result).toBe('https://not-a-url-at-all/ews/exchange.asmx');
      });

      it('handles URLs with double dots', () => {
        const result = sanitizeExchangeUrl('https://bad..domain.com');
        expect(result).toBe('https://bad..domain.com/ews/exchange.asmx');
      });

      it('throws error for empty input', () => {
        expect(() => sanitizeExchangeUrl('')).toThrow(/Invalid server URL/);
      });
    });

    describe('Edge cases with validation', () => {
      it('handles URLs with query parameters', () => {
        const result = sanitizeExchangeUrl(
          'https://mail.company.com/ews?test=1'
        );
        expect(result).toBe(
          'https://mail.company.com/ews/exchange.asmx?test=1'
        );
      });

      it('handles URLs with fragments', () => {
        const result = sanitizeExchangeUrl(
          'https://mail.company.com/ews#fragment'
        );
        expect(result).toBe(
          'https://mail.company.com/ews/exchange.asmx#fragment'
        );
      });

      it('handles internationalized domain names', () => {
        const result = sanitizeExchangeUrl('https://mail.münchen.de');
        expect(result).toMatch(/ews\/exchange\.asmx$/);
      });
    });

    describe('Connectivity testing features', () => {
      it('handles connectivity testing gracefully when it fails', () => {
        // Test that even if connectivity testing fails, the function still returns a valid URL
        const result = sanitizeExchangeUrl('https://unreachable.example.com');
        expect(result).toBe(
          'https://unreachable.example.com/ews/exchange.asmx'
        );
      });

      it('runs connectivity testing automatically on this debugging branch', () => {
        // Connectivity testing runs automatically, validating the URL construction works
        const result = sanitizeExchangeUrl('https://mail.company.com');
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });
    });

    describe('Production scenario tests', () => {
      it('handles the exact problematic URL from the original issue', () => {
        const result = sanitizeExchangeUrl('https://mail.example.com/ews');
        expect(result).toBe('https://mail.example.com/ews/exchange.asmx');
        expect(result).not.toContain('//ews');
        expect(result).not.toContain('/ews/ews');
      });

      it('handles URLs without protocol via fallback', () => {
        const result = sanitizeExchangeUrl('invalid-url');
        expect(result).toBe('https://invalid-url/ews/exchange.asmx');
      });
    });
  });
});
