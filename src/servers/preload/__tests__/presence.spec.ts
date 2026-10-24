/** @jest-environment jsdom */
import { dispatch } from '../../../store';
import { WEBVIEW_USER_PRESENCE_CHANGED } from '../../../ui/actions';
import { getServerUrl } from '../urls';

jest.mock('electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
  },
}));

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../urls', () => ({
  getServerUrl: jest.fn(() => 'https://server.local'),
}));

jest.mock('../userLoggedIn', () => ({
  setUserLoggedIn: jest.fn(),
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const getServerUrlMock = getServerUrl as jest.MockedFunction<
  typeof getServerUrl
>;

describe('servers/preload/presence', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    getServerUrlMock.mockReturnValue('https://server.local');
  });

  describe('setUserPresence', () => {
    it('dispatches WEBVIEW_USER_PRESENCE_CHANGED with the current server url', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { setUserPresence } = require('../presence');

      setUserPresence({
        presence: 'online',
        presenceStatusText: 'Working',
        presenceConnection: 'connected',
        presenceSupported: true,
      });

      expect(dispatchMock).toHaveBeenCalledWith({
        type: WEBVIEW_USER_PRESENCE_CHANGED,
        payload: {
          url: 'https://server.local',
          presence: 'online',
          presenceStatusText: 'Working',
          presenceConnection: 'connected',
          presenceSupported: true,
        },
      });
    });
  });

  describe('onPresenceChangeRequested / listenToPresenceChangeRequests', () => {
    const fireIpcEvent = (
      ipcRendererOn: jest.Mock,
      status: string,
      statusText?: string
    ): void => {
      const entry = ipcRendererOn.mock.calls.find(
        ([channel]: [string]) => channel === 'presence/change-requested'
      );
      if (!entry) {
        throw new Error('No handler registered for presence/change-requested');
      }
      const handler = entry[1] as (
        _event: unknown,
        status: string,
        statusText?: string
      ) => void;
      handler({}, status, statusText);
    };

    it('registers ONE ipc listener even if listen is called twice', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron') as {
        ipcRenderer: { on: jest.Mock };
      };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { listenToPresenceChangeRequests } = require('../presence');

      listenToPresenceChangeRequests();
      listenToPresenceChangeRequests();

      expect(ipcRenderer.on).toHaveBeenCalledTimes(1);
      expect(ipcRenderer.on).toHaveBeenCalledWith(
        'presence/change-requested',
        expect.any(Function)
      );
    });

    it('invokes the registered callback when the ipc event fires', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron') as {
        ipcRenderer: { on: jest.Mock };
      };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const presence = require('../presence');

      presence.listenToPresenceChangeRequests();

      const cb = jest.fn();
      presence.onPresenceChangeRequested(cb);

      fireIpcEvent(ipcRenderer.on, 'away', 'Lunch');

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith('away', 'Lunch');
    });

    it('does nothing when the ipc event fires before a callback is registered', () => {
      // Reset module state so a freshly required `../presence` has no
      // registered callback left over from a prior test in this file.
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron') as {
        ipcRenderer: { on: jest.Mock };
      };
      ipcRenderer.on.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const presence = require('../presence');

      presence.listenToPresenceChangeRequests();

      expect(() => fireIpcEvent(ipcRenderer.on, 'busy')).not.toThrow();
    });
  });

  describe('setUserPresenceState / setUserStatusChangeHandler', () => {
    const loadPresence = ({ storeReady = true } = {}) => {
      jest.resetModules();
      /* eslint-disable @typescript-eslint/no-var-requires */
      const { ipcRenderer } = require('electron') as {
        ipcRenderer: { on: jest.Mock };
      };
      ipcRenderer.on.mockClear();
      const presence = require('../presence');
      if (storeReady) {
        presence.markPresenceStoreReady();
      }
      return {
        presence,
        dispatch: require('../../../store').dispatch as jest.Mock,
        setUserLoggedIn: require('../userLoggedIn')
          .setUserLoggedIn as jest.Mock,
        ipcOn: ipcRenderer.on,
      };
      /* eslint-enable @typescript-eslint/no-var-requires */
    };

    const snapshot = {
      loggedIn: true,
      connection: 'connected',
      status: 'busy',
      statusText: 'In a meeting',
      statusExpiresAt: '2026-10-19T18:00:00.000Z',
      availableStatuses: ['online', 'away', 'busy'],
      customStatuses: [{ id: 'meeting', name: 'In a meeting', status: 'busy' }],
    };

    it('dispatches the snapshot and reports the login state only when it changes', () => {
      const { presence, dispatch, setUserLoggedIn } = loadPresence();

      presence.setUserPresenceState(snapshot);
      presence.setUserPresenceState({ ...snapshot, status: 'away' });

      expect(dispatch).toHaveBeenLastCalledWith({
        type: WEBVIEW_USER_PRESENCE_CHANGED,
        payload: {
          url: 'https://server.local',
          presence: 'away',
          presenceStatusText: 'In a meeting',
          presenceConnection: 'connected',
          presenceSupported: true,
          presenceStatusExpiresAt: '2026-10-19T18:00:00.000Z',
          presenceAvailableStatuses: ['online', 'away', 'busy'],
          presenceCustomStatuses: [
            { id: 'meeting', name: 'In a meeting', status: 'busy' },
          ],
        },
      });
      expect(setUserLoggedIn).toHaveBeenCalledTimes(1);
      expect(setUserLoggedIn).toHaveBeenCalledWith(true);
    });

    it('ignores the injected script once the web client reports presence', () => {
      const { presence, dispatch } = loadPresence();

      presence.setUserPresenceState(snapshot);
      dispatch.mockClear();
      presence.setUserPresence({
        presence: 'online',
        presenceStatusText: undefined,
        presenceConnection: 'connected',
        presenceSupported: true,
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('tells the injected script to stop once the web client reports presence', () => {
      const { presence } = loadPresence();
      const stopBeforeReport = jest.fn();
      const stopAfterReport = jest.fn();

      presence.onUserPresenceStateReported(stopBeforeReport);
      presence.setUserPresenceState(snapshot);
      presence.setUserPresenceState(snapshot);
      presence.onUserPresenceStateReported(stopAfterReport);

      expect(stopBeforeReport).toHaveBeenCalledTimes(1);
      expect(stopAfterReport).toHaveBeenCalledTimes(1);
    });

    it('sends tray requests to the web client handler instead of the injected script', async () => {
      const { presence, ipcOn } = loadPresence();
      const handler = jest.fn(() => Promise.resolve());
      const injectedCallback = jest.fn();

      presence.listenToPresenceChangeRequests();
      presence.onPresenceChangeRequested(injectedCallback);
      presence.setUserStatusChangeHandler(handler);

      const [, listener] = ipcOn.mock.calls.find(
        ([channel]: [string]) => channel === 'presence/change-requested'
      );
      listener({}, 'away');
      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith({ status: 'away' });
      expect(injectedCallback).not.toHaveBeenCalled();
    });

    it('passes the custom status id of a tray request to the web client handler', async () => {
      const { presence, ipcOn } = loadPresence();
      const handler = jest.fn(() => Promise.resolve());

      presence.listenToPresenceChangeRequests();
      presence.setUserStatusChangeHandler(handler);

      const [, listener] = ipcOn.mock.calls.find(
        ([channel]: [string]) => channel === 'presence/change-requested'
      );
      listener({}, 'busy', undefined, 'meeting');
      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith({
        status: 'busy',
        customStatusId: 'meeting',
      });
    });

    it('keeps a snapshot reported before the store exists and replays the latest one', () => {
      const { presence, dispatch, setUserLoggedIn } = loadPresence({
        storeReady: false,
      });

      presence.setUserPresenceState(snapshot);
      presence.setUserPresenceState({ ...snapshot, status: 'away' });

      expect(dispatch).not.toHaveBeenCalled();
      expect(setUserLoggedIn).not.toHaveBeenCalled();

      presence.markPresenceStoreReady();

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: WEBVIEW_USER_PRESENCE_CHANGED,
          payload: expect.objectContaining({ presence: 'away' }),
        })
      );
      expect(setUserLoggedIn).toHaveBeenCalledTimes(1);
      expect(setUserLoggedIn).toHaveBeenCalledWith(true);

      presence.markPresenceStoreReady();
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('drops values of the wrong type or shape from a snapshot', () => {
      const { presence, dispatch } = loadPresence();

      presence.setUserPresenceState({
        loggedIn: true,
        connection: 'bogus',
        status: '../../x',
        statusText: 42,
        statusExpiresAt: 'not a date',
        availableStatuses: {},
        customStatuses: {},
      });

      expect(dispatch).toHaveBeenCalledWith({
        type: WEBVIEW_USER_PRESENCE_CHANGED,
        payload: {
          url: 'https://server.local',
          presence: undefined,
          presenceStatusText: undefined,
          presenceConnection: undefined,
          presenceSupported: true,
          presenceStatusExpiresAt: undefined,
          presenceAvailableStatuses: [],
          presenceCustomStatuses: [],
        },
      });
    });

    it('keeps only valid entries of the status lists and caps their size', () => {
      const { presence, dispatch } = loadPresence();
      const manyStatuses = Array.from({ length: 150 }, (_, index) => ({
        id: `custom-${index}`,
        name: `Custom ${index}`,
        status: 'away',
      }));

      presence.setUserPresenceState({
        ...snapshot,
        availableStatuses: ['online', '../../x', 7, 'busy'],
        customStatuses: [
          { id: 'bad-status', name: 'Bad', status: '../../x' },
          { id: 1, name: 'Bad id', status: 'away' },
          { id: 'bad-name', name: {}, status: 'away' },
          null,
          'lunch',
          { id: 'long', name: 'x'.repeat(1000), status: 'busy', extra: true },
          ...manyStatuses,
        ],
      });

      const { payload } = dispatch.mock.calls[0][0];
      expect(payload.presenceAvailableStatuses).toEqual(['online', 'busy']);
      expect(payload.presenceCustomStatuses).toHaveLength(100);
      expect(payload.presenceCustomStatuses[0]).toEqual({
        id: 'long',
        name: 'x'.repeat(256),
        status: 'busy',
      });
      expect(payload.presenceCustomStatuses[1]).toEqual(manyStatuses[0]);
    });

    it.each([
      [
        'an Error',
        new Error('Unknown user status: lunch'),
        'Status change failed: Unknown user status: lunch',
      ],
      [
        'a REST error body',
        {
          success: false,
          error: 'Not allowed [error-not-allowed]',
          errorType: 'error-not-allowed',
        },
        'Status change failed: error-not-allowed Not allowed [error-not-allowed]',
      ],
      [
        'a copy of an HTTP response',
        { status: 429, statusText: 'Too Many Requests' },
        'Status change failed: 429 Too Many Requests',
      ],
      ['an object with no known field', {}, 'Status change failed: {}'],
    ])(
      'logs the details of a rejected change when the handler rejects with %s',
      async (_case, rejection, message) => {
        const { presence, ipcOn } = loadPresence();
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {
          // The rejected change logs a warning on purpose.
        });

        try {
          presence.listenToPresenceChangeRequests();
          presence.setUserStatusChangeHandler(() => Promise.reject(rejection));
          const [, listener] = ipcOn.mock.calls.find(
            ([channel]: [string]) => channel === 'presence/change-requested'
          );
          listener({}, 'away');
          // The handler call and its rejection take a few microtasks.
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();

          expect(warn).toHaveBeenCalledTimes(1);
          expect(warn.mock.calls[0]).toEqual([
            `[Rocket.Chat Desktop] ${message}`,
          ]);
        } finally {
          warn.mockRestore();
        }
      }
    );

    it.each([
      ['returns no promise', jest.fn(() => undefined), 0],
      [
        'throws',
        jest.fn(() => {
          throw new Error('boom');
        }),
        1,
      ],
    ])(
      'does not throw when the web client handler %s',
      async (_case, handler, warnings) => {
        const { presence, ipcOn } = loadPresence();
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {
          // The failing handler logs a warning on purpose.
        });

        presence.listenToPresenceChangeRequests();
        presence.setUserStatusChangeHandler(handler);
        const [, listener] = ipcOn.mock.calls.find(
          ([channel]: [string]) => channel === 'presence/change-requested'
        );

        expect(() => listener({}, 'away')).not.toThrow();
        await Promise.resolve();
        await Promise.resolve();

        expect(handler).toHaveBeenCalledWith({ status: 'away' });
        expect(warn).toHaveBeenCalledTimes(warnings);
        warn.mockRestore();
      }
    );
  });
});
