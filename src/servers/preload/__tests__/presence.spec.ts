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
});
