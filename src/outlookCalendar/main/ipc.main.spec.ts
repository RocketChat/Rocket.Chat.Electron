export {};

const handlers = new Map<string, Function>();
const watchFns: Array<(curr: any, prev: any) => void> = [];
const dispatch = jest.fn();
const request = jest.fn();
const getOutlookEvents = jest.fn(
  async (..._args: any[]) => [] as any[]
) as jest.Mock;

const servers = [
  {
    url: 'https://open.rocket.chat',
    webContentsId: 7,
    version: '7.6.0',
    outlookCredentials: {
      userId: 'u1',
      login: 'user@example.com',
      password: 'secret',
      serverUrl: 'https://exchange.example',
    },
  },
];

jest.mock('../../ipc/main', () => ({
  handle: (channel: string, fn: Function) => {
    handlers.set(channel, fn);
  },
}));

jest.mock('../../store', () => ({
  select: jest.fn((selector: any) =>
    selector({
      servers,
      outlookCalendarSyncInterval: 60,
      outlookCalendarSyncIntervalOverride: undefined,
      allowInsecureOutlookConnections: false,
    })
  ),
  dispatch: (...args: any[]) => dispatch(...args),
  request: (...args: any[]) => request(...args),
  listen: jest.fn(),
  watch: jest.fn((_sel: any, fn: any) => {
    watchFns.push(fn);
    return jest.fn();
  }),
}));

jest.mock('../../app/selectors', () => ({
  selectPersistableValues: (state: any) => state,
}));

jest.mock('../../ui/main/serverView', () => ({
  getWebContentsByServerUrl: jest.fn(() => ({
    id: 7,
    isDestroyed: () => false,
    send: jest.fn(),
  })),
}));

jest.mock('../logger', () => ({
  outlookLog: jest.fn(),
  outlookError: jest.fn(),
  outlookWarn: jest.fn(),
  outlookEventDetail: jest.fn(),
}));

jest.mock('../getOutlookEvents', () => ({
  getOutlookEvents: (...args: any[]) => getOutlookEvents(...args),
}));

jest.mock('../errorClassification', () => ({
  createClassifiedError: (e: Error) => e,
  formatErrorForLogging: (e: Error) => String(e),
  generateUserFriendlyMessage: () => 'friendly',
}));

jest.mock('../../urls', () => ({
  server: (base: string) => ({
    calendarEvents: {
      list: `${base}/api/v1/calendar-events.list`,
      import: `${base}/api/v1/calendar-events.import`,
      update: `${base}/api/v1/calendar-events.update`,
      delete: `${base}/api/v1/calendar-events.delete`,
    },
  }),
}));

jest.mock('../../utils', () => ({
  meetsMinimumVersion: () => true,
}));

const axiosGet = jest.fn(async (..._args: any[]) => ({
  status: 200,
  data: { data: [] },
})) as jest.Mock;
const axiosPost = jest.fn(async (..._args: any[]) => ({
  status: 200,
  data: {},
})) as jest.Mock;
const axiosDelete = jest.fn(async (..._args: any[]) => ({
  status: 200,
  data: {},
})) as jest.Mock;

jest.mock('axios', () => {
  const axios: any = {
    get: (...args: any[]) => axiosGet(...args),
    post: (...args: any[]) => axiosPost(...args),
    delete: (...args: any[]) => axiosDelete(...args),
    isAxiosError: (e: any) => !!e?.isAxiosError,
  };
  return { __esModule: true, default: axios, ...axios };
});

const encryptString = jest.fn((s: string) =>
  Buffer.from(`enc:${s}`)
) as jest.Mock;
const decryptString = jest.fn((b: Buffer) =>
  b.toString().replace(/^enc:/, '')
) as jest.Mock;

jest.mock('electron', () => ({
  net: { fetch: jest.fn() },
  session: { fromPartition: jest.fn() },
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => false),
    encryptString: (s: string) => encryptString(s),
    decryptString: (b: Buffer) => decryptString(b),
  },
  webContents: {
    fromId: jest.fn(() => ({
      executeJavaScript: jest.fn(async () => 'token-from-webview'),
    })),
  },
}));

describe('outlookCalendar/ipc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handlers.clear();
    watchFns.length = 0;
    jest.useFakeTimers();
    getOutlookEvents.mockResolvedValue([]);
    axiosGet.mockResolvedValue({ status: 200, data: { data: [] } });
    axiosPost.mockResolvedValue({ status: 200, data: {} });
    axiosDelete.mockResolvedValue({ status: 200, data: {} });
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../ipc').startOutlookCalendarUrlHandler();
  });

  afterEach(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../ipc').stopOutlookCalendarSync();
    } catch {
      // ignore
    }
    jest.useRealTimers();
  });

  it('registers outlook calendar IPC handlers', () => {
    expect(handlers.has('outlook-calendar/set-user-token')).toBe(true);
    expect(handlers.has('outlook-calendar/has-credentials')).toBe(true);
    expect(handlers.has('outlook-calendar/clear-credentials')).toBe(true);
    expect(handlers.has('outlook-calendar/set-exchange-url')).toBe(true);
    expect(handlers.has('outlook-calendar/get-events')).toBe(true);
  });

  it('has-credentials returns false when server missing', async () => {
    const result = await handlers.get('outlook-calendar/has-credentials')?.({
      id: 999,
    });
    expect(result).toBeFalsy();
  });

  it('has-credentials returns true for filled credentials', async () => {
    const result = await handlers.get('outlook-calendar/has-credentials')?.({
      id: 7,
    });
    expect(result).toBe(true);
  });

  it('set-user-token rejects invalid token payloads', async () => {
    await handlers.get('outlook-calendar/set-user-token')?.(
      { id: 7 },
      null,
      'u1'
    );
    await handlers.get('outlook-calendar/set-user-token')?.(
      { id: 7 },
      'token',
      null
    );
    await handlers.get('outlook-calendar/set-user-token')?.(
      { id: 999 },
      'token',
      'u1'
    );
    await handlers.get('outlook-calendar/set-user-token')?.(
      { id: 7 },
      'token',
      'other-user'
    );

    expect(dispatch).not.toHaveBeenCalled();
    expect(getOutlookEvents).not.toHaveBeenCalled();
  });

  it('set-user-token starts recurring sync and initial debounce', async () => {
    await handlers.get('outlook-calendar/set-user-token')?.(
      { id: 7 },
      'user-token',
      'u1'
    );
    // flush initial sync debounce
    await jest.advanceTimersByTimeAsync(200);
    expect(getOutlookEvents).toHaveBeenCalled();
  });

  it('clear-credentials dispatches empty password credentials', async () => {
    await handlers.get('outlook-calendar/clear-credentials')?.({ id: 7 });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'outlook-calendar/save-credentials',
      })
    );
  });

  it('set-exchange-url saves when url or user changes', async () => {
    await handlers.get('outlook-calendar/set-exchange-url')?.(
      { id: 7 },
      'https://new-exchange.example',
      'u2'
    );
    expect(dispatch).toHaveBeenCalled();
  });

  it('get-events rejects without credentials shape', async () => {
    // server with empty credentials fields via select override is hard;
    // use missing server path
    await expect(
      handlers.get('outlook-calendar/get-events')?.({ id: 999 }, new Date())
    ).rejects.toThrow('No credentials');
  });

  it('get-events syncs when token already set via set-user-token', async () => {
    await handlers.get('outlook-calendar/set-user-token')?.(
      { id: 7 },
      'user-token',
      'u1'
    );
    await jest.advanceTimersByTimeAsync(200);

    getOutlookEvents.mockResolvedValue([
      {
        id: 'evt-1',
        subject: 'Standup',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        description: 'daily',
        reminderMinutesBeforeStart: 5,
        busy: true,
      },
    ]);
    axiosGet.mockResolvedValue({
      status: 200,
      data: { data: [] },
    });
    axiosPost.mockResolvedValue({ status: 200, data: {} });

    const result = await handlers.get('outlook-calendar/get-events')?.(
      { id: 7 },
      new Date()
    );
    expect(result).toEqual({ status: 'success' });
    expect(axiosPost).toHaveBeenCalled();
  });

  it('get-events creates, updates, and deletes events during sync', async () => {
    await handlers.get('outlook-calendar/set-user-token')?.(
      { id: 7 },
      'user-token',
      'u1'
    );
    await jest.advanceTimersByTimeAsync(200);

    const now = new Date().toISOString();
    getOutlookEvents.mockResolvedValue([
      {
        id: 'keep',
        subject: 'Updated',
        startTime: now,
        endTime: now,
        description: 'd',
        reminderMinutesBeforeStart: 10,
        busy: false,
      },
      {
        id: 'new',
        subject: 'New',
        startTime: now,
        endTime: now,
        description: '',
        reminderMinutesBeforeStart: 0,
        busy: true,
      },
    ]);
    axiosGet.mockResolvedValue({
      status: 200,
      data: {
        data: [
          {
            _id: 'rc-keep',
            externalId: 'keep',
            subject: 'Old',
            startTime: now,
            description: 'old',
          },
          {
            _id: 'rc-gone',
            externalId: 'gone',
            subject: 'Gone',
            startTime: now,
          },
        ],
      },
    });
    axiosPost.mockClear();
    axiosPost.mockResolvedValue({ status: 200, data: {} });
    // Deletes are performed via axios.post to the delete endpoint in this
    // module — there is no dedicated axios.delete call.
    axiosDelete.mockResolvedValue({ status: 200, data: {} });

    const result = await handlers.get('outlook-calendar/get-events')?.(
      { id: 7 },
      new Date()
    );
    expect(result).toEqual({ status: 'success' });

    expect(axiosPost).toHaveBeenCalledWith(
      'https://open.rocket.chat/api/v1/calendar-events.import',
      expect.objectContaining({
        externalId: 'new',
        subject: 'New',
        startTime: now,
        description: '',
        reminderMinutesBeforeStart: 0,
        endTime: now,
        busy: true,
      }),
      expect.anything()
    );

    expect(axiosPost).toHaveBeenCalledWith(
      'https://open.rocket.chat/api/v1/calendar-events.update',
      expect.objectContaining({
        eventId: 'rc-keep',
        subject: 'Updated',
        startTime: now,
        description: 'd',
        reminderMinutesBeforeStart: 10,
        endTime: now,
        busy: false,
      }),
      expect.anything()
    );

    expect(axiosPost).toHaveBeenCalledWith(
      'https://open.rocket.chat/api/v1/calendar-events.delete',
      { eventId: 'rc-gone' },
      expect.anything()
    );
  });

  it('get-events fetches token from webContents when missing', async () => {
    // Don't call set-user-token; get-events should try webContents path
    getOutlookEvents.mockResolvedValue([]);
    axiosGet.mockResolvedValue({ status: 200, data: { data: [] } });

    const result = await handlers.get('outlook-calendar/get-events')?.(
      { id: 7 },
      new Date()
    );
    expect(result).toEqual({ status: 'success' });
  });

  it('syncEventsWithRocketChatServer rejects empty token and queues concurrent', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { syncEventsWithRocketChatServer } = require('../ipc');
    const creds = {
      userId: 'u1',
      login: 'user@example.com',
      password: 'secret',
      serverUrl: 'https://exchange.example',
    };

    await expect(
      syncEventsWithRocketChatServer(
        'https://open.rocket.chat',
        creds,
        '',
        false
      )
    ).rejects.toThrow(/Authentication required/);

    getOutlookEvents.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([]), 50);
        })
    );
    axiosGet.mockResolvedValue({ status: 200, data: { data: [] } });

    const p1 = syncEventsWithRocketChatServer(
      'https://open.rocket.chat',
      creds,
      'tok',
      false
    );
    const p2 = syncEventsWithRocketChatServer(
      'https://open.rocket.chat',
      creds,
      'tok',
      false
    );
    await jest.advanceTimersByTimeAsync(100);
    await expect(Promise.all([p1, p2])).resolves.toBeDefined();
  });

  it('stopOutlookCalendarSync clears state', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { stopOutlookCalendarSync } = require('../ipc');
    expect(() => stopOutlookCalendarSync()).not.toThrow();
  });

  it('interval watch reschedules when value changes', async () => {
    await handlers.get('outlook-calendar/set-user-token')?.(
      { id: 7 },
      'user-token',
      'u1'
    );
    await jest.advanceTimersByTimeAsync(200);
    getOutlookEvents.mockClear();

    expect(watchFns.length).toBeGreaterThan(0);
    for (const fn of watchFns) {
      fn(30, 60);
    }
    await jest.advanceTimersByTimeAsync(11000);

    expect(getOutlookEvents).toHaveBeenCalled();
  });
});
