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
    const loadPresence = () => {
      jest.resetModules();
      /* eslint-disable @typescript-eslint/no-var-requires */
      const { ipcRenderer } = require('electron') as {
        ipcRenderer: { on: jest.Mock };
      };
      ipcRenderer.on.mockClear();
      return {
        presence: require('../presence'),
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

    it('sends tray requests to the web client handler instead of the injected script', () => {
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

      expect(handler).toHaveBeenCalledWith({ status: 'away' });
      expect(injectedCallback).not.toHaveBeenCalled();
    });

    it('passes the custom status id of a tray request to the web client handler', () => {
      const { presence, ipcOn } = loadPresence();
      const handler = jest.fn(() => Promise.resolve());

      presence.listenToPresenceChangeRequests();
      presence.setUserStatusChangeHandler(handler);

      const [, listener] = ipcOn.mock.calls.find(
        ([channel]: [string]) => channel === 'presence/change-requested'
      );
      listener({}, 'busy', undefined, 'meeting');

      expect(handler).toHaveBeenCalledWith({
        status: 'busy',
        customStatusId: 'meeting',
      });
    });
  });
});
