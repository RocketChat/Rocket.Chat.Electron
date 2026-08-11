/**
 * Coverage for the axios contract in `src/outlookCalendar/ipc.ts`, added
 * alongside the axios `~1.13.6` -> `~1.18.0` bump. The five axios call sites
 * (`listEventsFromRocketChatServer` GET, `createEventOnRocketChatServer`,
 * `updateEventOnRocketChatServer` and `deleteEventOnRocketChatServer` POSTs)
 * are all module-internal and only reachable through the exported
 * `syncEventsWithRocketChatServer` / IPC handlers, so tests drive the real
 * exported surface and assert on the mocked `axios` calls it makes.
 *
 * Location note: this file lives in the module's existing
 * `src/outlookCalendar/__tests__/` convention (see `getOutlookEvents.spec.ts`,
 * `errorClassification.spec.ts`, `logger.spec.ts`), and is named
 * `ipc.main.spec.ts` because `ipc.ts` is main-process code (uses `handle` /
 * electron's `ipcMain`). Verified discovered by exactly the main-process
 * ('node' testEnvironment) project via `yarn test --listTests`.
 *
 * `../logger` is mocked (mirrors `getOutlookEvents.spec.ts`) so no
 * console.warn/error output leaks into the test run.
 */
jest.mock('../logger', () => ({
  outlookLog: jest.fn(),
  outlookError: jest.fn(),
  outlookWarn: jest.fn(),
  outlookEventDetail: jest.fn(),
}));

jest.mock('../getOutlookEvents', () => ({
  getOutlookEvents: jest.fn(),
}));

jest.mock('axios');

const selectMock = jest.fn();
const dispatchMock = jest.fn();
const watchMock = jest.fn();
const requestMock = jest.fn();
jest.mock('../../store', () => ({
  select: (...args: any[]) => selectMock(...args),
  dispatch: (...args: any[]) => dispatchMock(...args),
  watch: (...args: any[]) => watchMock(...args),
  request: (...args: any[]) => requestMock(...args),
}));

const handleRegistry = new Map<string, (...args: any[]) => any>();
jest.mock('../../ipc/main', () => ({
  handle: jest.fn((channel: string, cb: (...args: any[]) => any) => {
    handleRegistry.set(channel, cb);
    return () => handleRegistry.delete(channel);
  }),
}));

const isEncryptionAvailableMock = jest.fn(() => false);
jest.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => isEncryptionAvailableMock(),
    encryptString: jest.fn((s: string) => Buffer.from(s)),
    decryptString: jest.fn((b: Buffer) => b.toString()),
  },
  webContents: {
    fromId: jest.fn(() => undefined),
  },
}));

// eslint-disable-next-line import/first
import axios from 'axios';

// eslint-disable-next-line import/first
import { getOutlookEvents } from '../getOutlookEvents';
// eslint-disable-next-line import/first
import type * as OutlookIpcModule from '../ipc';
// eslint-disable-next-line import/first
import type {
  AppointmentData,
  OutlookCredentials,
  RocketChatCalendarEvent,
  RocketChatEventsResponse,
} from '../type';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetOutlookEvents = getOutlookEvents as jest.Mock;

const credentials: OutlookCredentials = {
  userId: 'user-1',
  serverUrl: 'https://mail.example.com',
  login: 'user@example.com',
  password: 'secret',
};

const serverUrl = 'https://rc.example.com/';
const token = 'rc-token';

const makeAppointment = (
  overrides: Partial<AppointmentData> = {}
): AppointmentData => ({
  id: 'appt-1',
  subject: 'Standup',
  startTime: '2024-01-15T09:00:00.000Z',
  endTime: '2024-01-15T09:30:00.000Z',
  description: 'Daily sync',
  isAllDay: false,
  isCanceled: false,
  busy: true,
  ...overrides,
});

const makeRcEvent = (
  overrides: Partial<RocketChatCalendarEvent> = {}
): RocketChatCalendarEvent => ({
  _id: 'rc-1',
  externalId: 'appt-1',
  subject: 'Standup',
  startTime: '2024-01-15T09:00:00.000Z',
  ...overrides,
});

const emptyRcResponse: RocketChatEventsResponse = { success: true, data: [] };

/** Builds a rejection value that satisfies `axios.isAxiosError` narrowing. */
const makeAxiosError = (overrides: Record<string, any> = {}) => ({
  isAxiosError: true,
  message: 'Request failed with status code 500',
  name: 'AxiosError',
  response: {
    status: 500,
    statusText: 'Internal Server Error',
    data: { error: 'boom' },
  },
  ...overrides,
});

describe('outlookCalendar/ipc — axios contract', () => {
  let syncEventsWithRocketChatServer: typeof OutlookIpcModule.syncEventsWithRocketChatServer;
  let stopOutlookCalendarSync: typeof OutlookIpcModule.stopOutlookCalendarSync;

  beforeAll(async () => {
    ({ syncEventsWithRocketChatServer, stopOutlookCalendarSync } = await import(
      '../ipc'
    ));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    handleRegistry.clear();
    // Clear any recurring-sync timers/state left over by a previous test so
    // sync state does not leak across `it`s (module is imported once).
    stopOutlookCalendarSync();

    isEncryptionAvailableMock.mockReturnValue(false);
    selectMock.mockReturnValue({ servers: [] });
    mockedAxios.isAxiosError.mockImplementation(
      (error: unknown): error is any =>
        !!error &&
        typeof error === 'object' &&
        (error as any).isAxiosError === true
    );
    mockedGetOutlookEvents.mockResolvedValue([]);
  });

  describe('listEventsFromRocketChatServer (axios.get, L174)', () => {
    it('sends the auth headers and timeout, and feeds the response into the sync', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: emptyRcResponse,
      });

      await syncEventsWithRocketChatServer(serverUrl, credentials, token);

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      const [url, config] = mockedAxios.get.mock.calls[0];
      expect(url).toBe(`${serverUrl}api/v1/calendar-events.list`);
      expect(config).toMatchObject({
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': credentials.userId,
        },
        timeout: 10_000,
      });
    });

    it('classifies an AxiosError (status/statusText/data) and aborts the sync without throwing the raw error', async () => {
      mockedAxios.get.mockRejectedValueOnce(
        makeAxiosError({
          response: { status: 401, statusText: 'Unauthorized', data: 'nope' },
        })
      );

      // listEventsFromRocketChatServer returns null on failure, and
      // performSync converts that into a generic "sync cannot proceed" error
      // (the classified status/statusText/data are consumed internally by
      // createClassifiedError/outlookError, which are mocked away here).
      await expect(
        syncEventsWithRocketChatServer(serverUrl, credentials, token)
      ).rejects.toThrow(/Sync failed during event fetching/);
    });

    it('takes the non-axios branch for a plain Error and still aborts the sync', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('plain network error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(
        syncEventsWithRocketChatServer(serverUrl, credentials, token)
      ).rejects.toThrow(/Sync failed during event fetching/);
    });
  });

  describe('createEventOnRocketChatServer (axios.post, L256)', () => {
    it('POSTs a new event with auth headers/timeout when the Outlook event is not yet on the RC server', async () => {
      mockedGetOutlookEvents.mockResolvedValueOnce([
        makeAppointment({ id: 'new-appt' }),
      ]);
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: emptyRcResponse,
      });
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

      await syncEventsWithRocketChatServer(serverUrl, credentials, token);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, payload, config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe(`${serverUrl}api/v1/calendar-events.import`);
      expect(payload).toMatchObject({ externalId: 'new-appt' });
      expect(config).toMatchObject({
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': credentials.userId,
        },
        timeout: 10_000,
      });
    });

    it('classifies an AxiosError on create but lets the sync loop continue (individual failures do not abort the sync)', async () => {
      mockedGetOutlookEvents.mockResolvedValueOnce([
        makeAppointment({ id: 'new-appt' }),
      ]);
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: emptyRcResponse,
      });
      mockedAxios.post.mockRejectedValueOnce(
        makeAxiosError({
          response: { status: 403, statusText: 'Forbidden', data: 'denied' },
        })
      );

      await expect(
        syncEventsWithRocketChatServer(serverUrl, credentials, token)
      ).resolves.toBeUndefined();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('takes the non-axios branch for a plain Error on create', async () => {
      mockedGetOutlookEvents.mockResolvedValueOnce([
        makeAppointment({ id: 'new-appt' }),
      ]);
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: emptyRcResponse,
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('plain create error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(
        syncEventsWithRocketChatServer(serverUrl, credentials, token)
      ).resolves.toBeUndefined();
    });
  });

  describe('updateEventOnRocketChatServer (axios.post, L343)', () => {
    it('POSTs an update with auth headers/timeout when a matching RC event has changed', async () => {
      const outlookAppointment = makeAppointment({
        id: 'appt-1',
        subject: 'Updated subject',
      });
      mockedGetOutlookEvents.mockResolvedValueOnce([outlookAppointment]);
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: [makeRcEvent({ subject: 'Old subject' })],
        },
      });
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

      await syncEventsWithRocketChatServer(serverUrl, credentials, token);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, payload, config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe(`${serverUrl}api/v1/calendar-events.update`);
      expect(payload).toMatchObject({
        eventId: 'rc-1',
        subject: 'Updated subject',
      });
      expect(config).toMatchObject({
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': credentials.userId,
        },
        timeout: 10_000,
      });
    });

    it('classifies an AxiosError on update without aborting the overall sync', async () => {
      mockedGetOutlookEvents.mockResolvedValueOnce([
        makeAppointment({ id: 'appt-1', subject: 'Updated subject' }),
      ]);
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: [makeRcEvent({ subject: 'Old subject' })],
        },
      });
      mockedAxios.post.mockRejectedValueOnce(
        makeAxiosError({
          response: { status: 500, statusText: 'Server Error', data: 'x' },
        })
      );

      await expect(
        syncEventsWithRocketChatServer(serverUrl, credentials, token)
      ).resolves.toBeUndefined();
    });

    it('takes the non-axios branch for a plain Error on update', async () => {
      mockedGetOutlookEvents.mockResolvedValueOnce([
        makeAppointment({ id: 'appt-1', subject: 'Updated subject' }),
      ]);
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: [makeRcEvent({ subject: 'Old subject' })],
        },
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('plain update error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(
        syncEventsWithRocketChatServer(serverUrl, credentials, token)
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteEventOnRocketChatServer (axios.post, L407)', () => {
    it('POSTs a delete with auth headers/timeout for RC events no longer on Outlook', async () => {
      mockedGetOutlookEvents.mockResolvedValueOnce([]);
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { success: true, data: [makeRcEvent({ _id: 'to-delete' })] },
      });
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

      await syncEventsWithRocketChatServer(serverUrl, credentials, token);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, payload, config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe(`${serverUrl}api/v1/calendar-events.delete`);
      expect(payload).toMatchObject({ eventId: 'to-delete' });
      expect(config).toMatchObject({
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': credentials.userId,
        },
        timeout: 10_000,
      });
    });

    it('classifies an AxiosError on delete without aborting the overall sync', async () => {
      mockedGetOutlookEvents.mockResolvedValueOnce([]);
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { success: true, data: [makeRcEvent({ _id: 'to-delete' })] },
      });
      mockedAxios.post.mockRejectedValueOnce(
        makeAxiosError({
          response: { status: 404, statusText: 'Not Found', data: 'gone' },
        })
      );

      await expect(
        syncEventsWithRocketChatServer(serverUrl, credentials, token)
      ).resolves.toBeUndefined();
    });

    it('takes the non-axios branch for a plain Error on delete', async () => {
      mockedGetOutlookEvents.mockResolvedValueOnce([]);
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { success: true, data: [makeRcEvent({ _id: 'to-delete' })] },
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('plain delete error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(
        syncEventsWithRocketChatServer(serverUrl, credentials, token)
      ).resolves.toBeUndefined();
    });
  });

  describe('syncEventsWithRocketChatServer', () => {
    it('rejects immediately when no token is provided', async () => {
      await expect(
        syncEventsWithRocketChatServer(serverUrl, credentials, '' as any)
      ).rejects.toThrow(/Authentication required/);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('is a no-op (no axios calls) when credentials are incomplete', async () => {
      await syncEventsWithRocketChatServer(
        serverUrl,
        { ...credentials, login: '' },
        token
      );

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('startOutlookCalendarUrlHandler / stopOutlookCalendarSync (exported IPC surface)', () => {
    it('registers the has-credentials handler and reports true for complete credentials', async () => {
      const { startOutlookCalendarUrlHandler } = await import('../ipc');
      startOutlookCalendarUrlHandler();

      selectMock.mockReturnValue({
        servers: [
          {
            url: serverUrl,
            webContentsId: 1,
            outlookCredentials: credentials,
          },
        ],
      });

      const handler = handleRegistry.get('outlook-calendar/has-credentials');
      expect(handler).toBeDefined();

      const result = await handler!({ id: 1 });
      expect(result).toBe(true);
    });

    it('registers the has-credentials handler and reports false when no server matches', async () => {
      const { startOutlookCalendarUrlHandler } = await import('../ipc');
      startOutlookCalendarUrlHandler();
      selectMock.mockReturnValue({ servers: [] });

      const handler = handleRegistry.get('outlook-calendar/has-credentials');
      const result = await handler!({ id: 999 });
      expect(result).toBe(false);
    });

    it('stopOutlookCalendarSync clears tracked server state without throwing', () => {
      expect(() => stopOutlookCalendarSync()).not.toThrow();
    });
  });
});
