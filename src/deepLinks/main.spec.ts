import { app } from 'electron';

import { ServerUrlResolutionStatus } from '../servers/common';
import { resolveServerUrl } from '../servers/main';
import { select, dispatch, listen } from '../store';
import { TELEPHONY_PREFERRED_SERVER_SET } from '../telephony/actions';
import { telephonyPreferredServer } from '../telephony/reducers';
import {
  TELEPHONY_SERVER_SELECT_OPEN,
  TELEPHONY_SERVER_SELECT_CLOSE,
} from '../ui/actions';
import {
  warnAboutInvalidServerUrl,
  askForServerAddition,
} from '../ui/main/dialogs';
import { getRootWindow } from '../ui/main/rootWindow';
import { getWebContentsByServerUrl } from '../ui/main/serverView';
import { DEEP_LINKS_SERVER_ADDED } from './actions';
import {
  parseTelephonyLink,
  getDeepLinkArgs,
  performTelephonyCall,
  setupDeepLinks,
  processDeepLinksInArgs,
} from './main';
import type { TelephonyLink } from './main';

jest.mock('electron', () => ({
  app: {
    addListener: jest.fn(),
    isPackaged: false,
    getPath: jest.fn(),
    getName: jest.fn(() => 'Rocket.Chat'),
  },
}));
jest.mock('../store');
jest.mock('../ui/main/serverView');
jest.mock('../servers/main');
jest.mock('../ui/main/dialogs');
jest.mock('../ui/main/rootWindow');
jest.mock('../app/main/app', () => ({
  electronBuilderJsonInformation: { protocol: 'rocketchat' },
  packageJsonInformation: { goUrlShortener: 'go.rocket.chat' },
}));

const selectMock = select as jest.MockedFunction<typeof select>;
const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const listenMock = listen as jest.MockedFunction<typeof listen>;
const getWebContentsByServerUrlMock =
  getWebContentsByServerUrl as jest.MockedFunction<
    typeof getWebContentsByServerUrl
  >;
const resolveServerUrlMock = resolveServerUrl as jest.MockedFunction<
  typeof resolveServerUrl
>;
const getRootWindowMock = getRootWindow as jest.MockedFunction<
  typeof getRootWindow
>;
const appMock = app as jest.Mocked<typeof app>;
const askForServerAdditionMock = askForServerAddition as jest.MockedFunction<
  typeof askForServerAddition
>;

describe('deepLinks/main.ts', () => {
  const mockRootWindow = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    getRootWindowMock.mockResolvedValue(mockRootWindow);
  });

  const simulateModalResponse = (
    payload: { serverUrl: string; rememberChoice: boolean } | null
  ) => {
    listenMock.mockImplementation((_type: any, callback: any) => {
      setTimeout(
        () => callback({ type: TELEPHONY_SERVER_SELECT_CLOSE, payload }),
        0
      );
      return jest.fn();
    });
  };

  describe('getDeepLinkArgs', () => {
    it('keeps only supported deep link arguments', () => {
      expect(
        getDeepLinkArgs([
          'electron',
          '.',
          '--force-renderer-accessibility',
          'tel:+491234567890',
          '--source-app-id',
          'callto:+15551234567',
          'rocketchat://auth?host=https://chat.example.com&token=abc&userId=123',
          'https://go.rocket.chat/invite?host=https://chat.example.com',
          'https://example.com/not-a-deep-link',
        ])
      ).toEqual([
        'tel:+491234567890',
        'callto:+15551234567',
        'rocketchat://auth?host=https://chat.example.com&token=abc&userId=123',
        'https://go.rocket.chat/invite?host=https://chat.example.com',
      ]);
    });
  });

  describe('parseTelephonyLink', () => {
    it('should parse valid tel: with international format', () => {
      const result = parseTelephonyLink('tel:+491234567890');
      expect(result).toEqual({
        phoneNumber: '+491234567890',
        rawUri: 'tel:+491234567890',
      });
    });

    it('should parse valid callto: protocol', () => {
      const result = parseTelephonyLink('callto:+1-800-555-0199');
      expect(result).toEqual({
        phoneNumber: '+18005550199',
        rawUri: 'callto:+1-800-555-0199',
      });
    });

    it('should strip spaces, dashes, parens, and dots', () => {
      const result = parseTelephonyLink('tel:(049) 123-456.78');
      expect(result).toEqual({
        phoneNumber: '04912345678',
        rawUri: 'tel:(049) 123-456.78',
      });
    });

    it('should return null when empty number after stripping', () => {
      const result = parseTelephonyLink('tel:---');
      expect(result).toBeNull();
    });

    it('should return null for CLI flags starting with --', () => {
      const result = parseTelephonyLink('--tel:+49123');
      expect(result).toBeNull();
    });

    it('should return null for non-telephony protocols', () => {
      const result = parseTelephonyLink('rocketchat://auth?host=x');
      expect(result).toBeNull();
    });

    it('should return null for invalid URL', () => {
      const result = parseTelephonyLink('not a url at all');
      expect(result).toBeNull();
    });

    it('should return null for tel: with no number', () => {
      const result = parseTelephonyLink('tel:');
      expect(result).toBeNull();
    });

    it('should preserve + prefix', () => {
      const result = parseTelephonyLink('tel:+44207123456');
      expect(result).toEqual({
        phoneNumber: '+44207123456',
        rawUri: 'tel:+44207123456',
      });
    });

    it('should handle callto:// with double-slash (authority) format', () => {
      const result = parseTelephonyLink('callto://+491234567890');
      expect(result).toEqual({
        phoneNumber: '+491234567890',
        rawUri: 'callto://+491234567890',
      });
    });

    it('should ignore query strings in callto:// authority format', () => {
      const result = parseTelephonyLink('callto://+491234567890?source=crm');
      expect(result).toEqual({
        phoneNumber: '+491234567890',
        rawUri: 'callto://+491234567890?source=crm',
      });
    });

    it('should ignore fragments in callto:// authority format', () => {
      const result = parseTelephonyLink('callto://+491234567890#details');
      expect(result).toEqual({
        phoneNumber: '+491234567890',
        rawUri: 'callto://+491234567890#details',
      });
    });

    it('should preserve callto: with extension syntax', () => {
      const result = parseTelephonyLink('callto:+1234;ext=5678');
      expect(result).toEqual({
        phoneNumber: '+1234;ext=5678',
        rawUri: 'callto:+1234;ext=5678',
      });
    });
  });

  describe('performTelephonyCall', () => {
    const mockWebContents = {
      send: jest.fn(),
      isDestroyed: jest.fn(() => false),
    };

    const mockLink: TelephonyLink = {
      phoneNumber: '+491234567890',
      rawUri: 'tel:+491234567890',
    };

    beforeEach(() => {
      // Mock getWebContentsByServerUrl to return immediately (no polling needed)
      getWebContentsByServerUrlMock.mockReturnValue(mockWebContents as any);
    });

    it('should no-op when there are 0 servers', async () => {
      selectMock.mockReturnValue([]);

      await performTelephonyCall(mockLink);

      expect(getWebContentsByServerUrlMock).not.toHaveBeenCalled();
      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('should auto-select when there is 1 server', async () => {
      selectMock.mockImplementation((selector: any) =>
        selector({
          isTelephonyEnabled: true,
          servers: [{ url: 'https://chat.example.com', title: 'Chat' }],
        })
      );

      await performTelephonyCall(mockLink);

      expect(getWebContentsByServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        {
          phoneNumber: '+491234567890',
          rawUri: 'tel:+491234567890',
        }
      );
      expect(listenMock).not.toHaveBeenCalled();
    });

    it('should open dialpad path with empty input when requested', async () => {
      selectMock.mockImplementation((selector: any) =>
        selector({
          isTelephonyEnabled: true,
          servers: [{ url: 'https://chat.example.com', title: 'Chat' }],
        })
      );

      await performTelephonyCall({ phoneNumber: '', rawUri: '' });

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        {
          phoneNumber: '',
          rawUri: '',
        }
      );
    });

    it('should show dialog when there are 2+ servers and no preference', async () => {
      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com', title: 'Server 1' },
          { url: 'https://server2.com', title: 'Server 2' },
        ])
        .mockReturnValueOnce(null);

      simulateModalResponse({
        serverUrl: 'https://server1.com',
        rememberChoice: false,
      });

      await performTelephonyCall(mockLink);

      expect(dispatchMock).toHaveBeenCalledWith({
        type: TELEPHONY_SERVER_SELECT_OPEN,
        payload: { phoneNumber: '+491234567890', rawUri: 'tel:+491234567890' },
      });

      expect(getWebContentsByServerUrlMock).toHaveBeenCalledWith(
        'https://server1.com'
      );
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        mockLink
      );
    });

    it('should skip dialog when preferred server exists in server list', async () => {
      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com', title: 'Server 1' },
          { url: 'https://server2.com', title: 'Server 2' },
        ])
        .mockReturnValueOnce('https://server2.com');

      await performTelephonyCall(mockLink);

      expect(listenMock).not.toHaveBeenCalled();
      expect(getWebContentsByServerUrlMock).toHaveBeenCalledWith(
        'https://server2.com'
      );
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        mockLink
      );
    });

    it('should show dialog when preferred server is stale (not in server list)', async () => {
      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com', title: 'Server 1' },
          { url: 'https://server2.com', title: 'Server 2' },
        ])
        .mockReturnValueOnce('https://stale-server.com');

      simulateModalResponse({
        serverUrl: 'https://server2.com',
        rememberChoice: false,
      });

      await performTelephonyCall(mockLink);

      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: TELEPHONY_SERVER_SELECT_OPEN })
      );
      expect(getWebContentsByServerUrlMock).toHaveBeenCalledWith(
        'https://server2.com'
      );
    });

    it('should dispatch TELEPHONY_PREFERRED_SERVER_SET when Remember is checked', async () => {
      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com', title: 'Server 1' },
          { url: 'https://server2.com', title: 'Server 2' },
        ])
        .mockReturnValueOnce(null);

      simulateModalResponse({
        serverUrl: 'https://server1.com',
        rememberChoice: true,
      });

      await performTelephonyCall(mockLink);

      expect(dispatchMock).toHaveBeenCalledWith({
        type: TELEPHONY_PREFERRED_SERVER_SET,
        payload: 'https://server1.com',
      });
    });

    it('should not dispatch when Remember is unchecked', async () => {
      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com', title: 'Server 1' },
          { url: 'https://server2.com', title: 'Server 2' },
        ])
        .mockReturnValueOnce(null);

      simulateModalResponse({
        serverUrl: 'https://server2.com',
        rememberChoice: false,
      });

      await performTelephonyCall(mockLink);

      expect(dispatchMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: TELEPHONY_PREFERRED_SERVER_SET })
      );
    });

    it('should dispatch open action even when server titles are missing', async () => {
      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com' },
          { url: 'https://server2.com' },
        ])
        .mockReturnValueOnce(null);

      simulateModalResponse({
        serverUrl: 'https://server1.com',
        rememberChoice: false,
      });

      await performTelephonyCall(mockLink);

      expect(dispatchMock).toHaveBeenCalledWith({
        type: TELEPHONY_SERVER_SELECT_OPEN,
        payload: { phoneNumber: '+491234567890', rawUri: 'tel:+491234567890' },
      });
    });

    it('should poll for webContents when not immediately available', async () => {
      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      let callCount = 0;
      getWebContentsByServerUrlMock.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return null as any;
        }
        return mockWebContents as any;
      });

      jest.useFakeTimers();
      const promise = performTelephonyCall(mockLink);
      await jest.advanceTimersByTimeAsync(250);
      await promise;
      jest.useRealTimers();

      expect(getWebContentsByServerUrlMock).toHaveBeenCalledTimes(3);
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        mockLink
      );
    });

    it('should not proceed when modal is cancelled (null response)', async () => {
      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com', title: 'Server 1' },
          { url: 'https://server2.com', title: 'Server 2' },
        ])
        .mockReturnValueOnce(null);

      simulateModalResponse(null);

      await performTelephonyCall(mockLink);

      expect(getWebContentsByServerUrlMock).not.toHaveBeenCalled();
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });

    it('should reject concurrent calls while modal is open', async () => {
      selectMock.mockReturnValue([
        { url: 'https://server1.com', title: 'Server 1' },
        { url: 'https://server2.com', title: 'Server 2' },
      ]);

      // First call: modal stays open (listen never fires)
      listenMock.mockImplementation(() => {
        // Never call the callback — modal stays open
        return jest.fn();
      });

      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com', title: 'Server 1' },
          { url: 'https://server2.com', title: 'Server 2' },
        ])
        .mockReturnValueOnce(null);

      const firstCall = performTelephonyCall(mockLink);

      // Yield so first call reaches the listen/promise
      await new Promise((r) => {
        setTimeout(r, 0);
      });

      // Second call should be rejected
      const secondLink: TelephonyLink = {
        phoneNumber: '+1999',
        rawUri: 'tel:+1999',
      };
      await performTelephonyCall(secondLink);

      // Only one OPEN dispatch (from first call)
      expect(dispatchMock).toHaveBeenCalledTimes(1);
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: TELEPHONY_SERVER_SELECT_OPEN })
      );

      // Clean up: force-close the modal so firstCall resolves
      const listenCallback = listenMock.mock.calls[0][1];
      listenCallback({
        type: TELEPHONY_SERVER_SELECT_CLOSE,
        payload: null,
      });
      await firstCall;
    });

    it('should not send when webContents times out', async () => {
      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      // webContents never becomes available
      getWebContentsByServerUrlMock.mockReturnValue(null as any);

      jest.useFakeTimers();
      const promise = performTelephonyCall(mockLink);
      // Advance past the 10s webContents timeout
      await jest.advanceTimersByTimeAsync(11_000);
      await promise;
      jest.useRealTimers();

      expect(mockWebContents.send).not.toHaveBeenCalled();
    });
  });

  describe('processDeepLink telephony routing', () => {
    const mockBrowserWindow = {
      isVisible: jest.fn(() => true),
      focus: jest.fn(),
      showInactive: jest.fn(),
    };

    const mockWebContents = {
      send: jest.fn(),
      isDestroyed: jest.fn(() => false),
      loadURL: jest.fn(),
    };

    beforeEach(() => {
      getRootWindowMock.mockResolvedValue(mockBrowserWindow as any);
      getWebContentsByServerUrlMock.mockReturnValue(mockWebContents as any);
    });

    it('should route tel: URL to telephony path', async () => {
      setupDeepLinks();

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const savedArgv = process.argv;
      process.argv = ['electron', '.', 'tel:+491234567890'];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      // Telephony path: getWebContentsByServerUrl called for the server
      expect(getWebContentsByServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        {
          phoneNumber: '+491234567890',
          rawUri: 'tel:+491234567890',
        }
      );
      // Normal deep link path NOT taken
      expect(resolveServerUrlMock).not.toHaveBeenCalled();
    });

    it('queues macOS open-url events until startup processing is ready', async () => {
      setupDeepLinks();

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const listenerCalls = appMock.addListener.mock.calls as Array<
        [string, (...args: any[]) => Promise<void> | void]
      >;
      const openUrlHandler = listenerCalls.find(
        ([eventName]) => eventName === 'open-url'
      )?.[1];
      const event = { preventDefault: jest.fn() };

      if (!openUrlHandler) {
        throw new Error('open-url listener was not registered');
      }

      await openUrlHandler(event, 'tel:+491234567890');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(getWebContentsByServerUrlMock).not.toHaveBeenCalled();

      await processDeepLinksInArgs();

      expect(mockBrowserWindow.focus).toHaveBeenCalled();
      expect(getWebContentsByServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        {
          phoneNumber: '+491234567890',
          rawUri: 'tel:+491234567890',
        }
      );
    });

    it('processes open-url immediately when ready', async () => {
      setupDeepLinks();

      const listenerCalls = appMock.addListener.mock.calls as Array<
        [string, (...args: any[]) => Promise<void> | void]
      >;
      const openUrlHandler = listenerCalls.find(
        ([eventName]) => eventName === 'open-url'
      )?.[1];
      const event = { preventDefault: jest.fn() };

      if (!openUrlHandler) {
        throw new Error('open-url listener was not registered');
      }

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      await processDeepLinksInArgs();

      await openUrlHandler(event, 'tel:+491234567890');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        {
          phoneNumber: '+491234567890',
          rawUri: 'tel:+491234567890',
        }
      );
      expect(mockBrowserWindow.focus).toHaveBeenCalled();
    });

    it('processes second-instance argv immediately', async () => {
      setupDeepLinks();

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const listenerCalls = appMock.addListener.mock.calls as Array<
        [string, (...args: any[]) => Promise<void> | void]
      >;
      const secondInstanceHandler = listenerCalls.find(
        ([eventName]) => eventName === 'second-instance'
      )?.[1];
      const event = { preventDefault: jest.fn() };

      if (!secondInstanceHandler) {
        throw new Error('second-instance listener was not registered');
      }

      await secondInstanceHandler(event, [
        'electron',
        '.',
        'tel:+491234567890',
      ]);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockBrowserWindow.focus).toHaveBeenCalled();
      expect(getWebContentsByServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        {
          phoneNumber: '+491234567890',
          rawUri: 'tel:+491234567890',
        }
      );
    });

    it('shows hidden root window when processing second-instance deep links', async () => {
      const hiddenWindow = {
        isVisible: jest.fn(() => false),
        focus: jest.fn(),
        showInactive: jest.fn(),
      };

      setupDeepLinks();
      getRootWindowMock.mockResolvedValue(hiddenWindow as any);
      getWebContentsByServerUrlMock.mockReturnValue(mockWebContents as any);

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const listenerCalls = appMock.addListener.mock.calls as Array<
        [string, (...args: any[]) => Promise<void> | void]
      >;
      const secondInstanceHandler = listenerCalls.find(
        ([eventName]) => eventName === 'second-instance'
      )?.[1];
      const event = { preventDefault: jest.fn() };

      if (!secondInstanceHandler) {
        throw new Error('second-instance listener was not registered');
      }

      await secondInstanceHandler(event, [
        'electron',
        '.',
        'tel:+491234567890',
      ]);

      expect(hiddenWindow.showInactive).toHaveBeenCalled();
      expect(hiddenWindow.focus).toHaveBeenCalled();
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        {
          phoneNumber: '+491234567890',
          rawUri: 'tel:+491234567890',
        }
      );
    });

    it('should route rocketchat:// URL to normal deep link path, not telephony', async () => {
      setupDeepLinks();

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.OK,
        undefined,
      ] as any);

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://auth?host=https://chat.example.com&token=abc&userId=123',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      // Normal deep link path taken
      expect(resolveServerUrlMock).toHaveBeenCalled();
      // Telephony modal NOT opened (telephony branch skipped)
      expect(listenMock).not.toHaveBeenCalled();
    });

    it('processes rocketchat://auth link with valid host/token/userId', async () => {
      setupDeepLinks();

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.OK,
        undefined,
      ] as any);

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://auth?host=https://chat.example.com&token=abc&userId=123',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(resolveServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.loadURL).toHaveBeenCalledWith(
        'https://chat.example.com/home?resumeToken=abc&userId=123'
      );
    });

    it('does nothing when rocketchat://auth is missing required params', async () => {
      setupDeepLinks();

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://auth?host=https://chat.example.com&token=abc',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(mockWebContents.loadURL).not.toHaveBeenCalled();
    });

    it('processes rocketchat://room link when host and path are valid', async () => {
      setupDeepLinks();

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.OK,
        undefined,
      ] as any);

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://room?host=https://chat.example.com&path=channel/general&token=abc&userId=123',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(resolveServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.loadURL).toHaveBeenCalledWith(
        'https://chat.example.com/channel/general?resumeToken=abc&userId=123'
      );
    });

    it('skips room deep links when path is missing', async () => {
      setupDeepLinks();

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.OK,
        undefined,
      ] as any);

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://room?host=https://chat.example.com',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(mockWebContents.loadURL).not.toHaveBeenCalled();
    });

    it('skips room deep links when path is invalid', async () => {
      setupDeepLinks();

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://room?host=https://chat.example.com&path=invalid%2Fpath',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(mockWebContents.loadURL).not.toHaveBeenCalled();
    });

    it('stops when room deep link server is declined from prompt', async () => {
      setupDeepLinks();

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.OK,
        undefined,
      ] as any);
      askForServerAdditionMock.mockResolvedValue(false);
      selectMock.mockImplementation((selector: any) =>
        selector({ servers: [] })
      );

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://room?host=https://chat.example.com&path=channel/general',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(askForServerAdditionMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.loadURL).not.toHaveBeenCalled();
    });

    it('does nothing for unsupported deep link URL', async () => {
      setupDeepLinks();

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'https://example.com/non-deep-link?path=channel/general',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(mockWebContents.loadURL).not.toHaveBeenCalled();
      expect(resolveServerUrlMock).not.toHaveBeenCalled();
    });

    it('adds the server when room deep-link server addition is approved', async () => {
      setupDeepLinks();

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.OK,
        undefined,
      ] as any);
      askForServerAdditionMock.mockResolvedValue(true);
      selectMock.mockImplementation((selector: any) =>
        selector({ servers: [] })
      );

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://room?host=https://chat.example.com&path=channel/general',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(askForServerAdditionMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(dispatchMock).toHaveBeenCalledWith({
        type: DEEP_LINKS_SERVER_ADDED,
        payload: 'https://chat.example.com',
      });
      expect(mockWebContents.loadURL).toHaveBeenCalledWith(
        'https://chat.example.com/channel/general'
      );
    });

    it('does not throw for unsupported open-url links', async () => {
      setupDeepLinks();

      const listenerCalls = appMock.addListener.mock.calls as Array<
        [string, (...args: any[]) => Promise<void> | void]
      >;
      const openUrlHandler = listenerCalls.find(
        ([eventName]) => eventName === 'open-url'
      )?.[1];
      const event = { preventDefault: jest.fn() };

      if (!openUrlHandler) {
        throw new Error('open-url listener was not registered');
      }

      await processDeepLinksInArgs();
      await openUrlHandler(event, 'https://example.com/non-deep-link');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockWebContents.send).not.toHaveBeenCalled();
      expect(getWebContentsByServerUrlMock).not.toHaveBeenCalled();
    });

    it('processes open-url when root window is hidden', async () => {
      const hiddenWindow = {
        isVisible: jest.fn(() => false),
        focus: jest.fn(),
        showInactive: jest.fn(),
      };

      setupDeepLinks();
      getRootWindowMock.mockResolvedValue(hiddenWindow as any);

      selectMock.mockImplementation((selector: any) =>
        selector({
          isTelephonyEnabled: true,
          servers: [{ url: 'https://chat.example.com', title: 'Chat' }],
        })
      );

      const listenerCalls = appMock.addListener.mock.calls as Array<
        [string, (...args: any[]) => Promise<void> | void]
      >;
      const openUrlHandler = listenerCalls.find(
        ([eventName]) => eventName === 'open-url'
      )?.[1];
      const event = { preventDefault: jest.fn() };

      if (!openUrlHandler) {
        throw new Error('open-url listener was not registered');
      }

      await processDeepLinksInArgs();
      await openUrlHandler(event, 'tel:+491234567890');

      expect(hiddenWindow.showInactive).toHaveBeenCalled();
      expect(hiddenWindow.focus).toHaveBeenCalled();
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        {
          phoneNumber: '+491234567890',
          rawUri: 'tel:+491234567890',
        }
      );
    });

    it('processes rocketchat://invite link when path is valid', async () => {
      setupDeepLinks();

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.OK,
        undefined,
      ] as any);

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://invite?host=https://chat.example.com&path=invite/example',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(resolveServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.loadURL).toHaveBeenCalledWith(
        'https://chat.example.com/invite/example'
      );
    });

    it('skips invite deep links when path is invalid', async () => {
      setupDeepLinks();

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://invite?host=https://chat.example.com&path=channels/general',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(mockWebContents.loadURL).not.toHaveBeenCalled();
    });

    it('processes rocketchat://conference link when path is valid', async () => {
      setupDeepLinks();

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.OK,
        undefined,
      ] as any);

      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://conference?host=https://chat.example.com&path=conference/room-1',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(resolveServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.loadURL).toHaveBeenCalledWith(
        'https://chat.example.com/conference/room-1'
      );
    });

    it('skips conference deep links when path is invalid', async () => {
      setupDeepLinks();

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://conference?host=https://chat.example.com&path=not-conference/room',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(mockWebContents.loadURL).not.toHaveBeenCalled();
    });

    it('warns when deep link server URL cannot be resolved', async () => {
      setupDeepLinks();

      const warnAboutInvalidServerUrlMock =
        warnAboutInvalidServerUrl as jest.MockedFunction<
          typeof warnAboutInvalidServerUrl
        >;

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.INVALID_URL,
        new Error('invalid server'),
      ] as any);

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://room?host=bad-server&path=channel/general',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(warnAboutInvalidServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com',
        'invalid server'
      );
      expect(mockWebContents.loadURL).not.toHaveBeenCalled();
    });
  });

  describe('isTelephonyEnabled gate for tel: deep links', () => {
    const mockBrowserWindow = {
      isVisible: jest.fn(() => true),
      focus: jest.fn(),
      showInactive: jest.fn(),
    };

    const mockWebContents = {
      send: jest.fn(),
      isDestroyed: jest.fn(() => false),
      loadURL: jest.fn(),
    };

    beforeEach(() => {
      getRootWindowMock.mockResolvedValue(mockBrowserWindow as any);
      getWebContentsByServerUrlMock.mockReturnValue(mockWebContents as any);
    });

    it('does NOT open dialpad for tel: link when isTelephonyEnabled=false', async () => {
      setupDeepLinks();

      selectMock.mockImplementation((selector: any) =>
        selector({
          isTelephonyEnabled: false,
          servers: [{ url: 'https://chat.example.com', title: 'Chat' }],
        })
      );

      const savedArgv = process.argv;
      process.argv = ['electron', '.', 'tel:+491234567890'];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(getWebContentsByServerUrlMock).not.toHaveBeenCalled();
      expect(mockWebContents.send).not.toHaveBeenCalled();
      expect(resolveServerUrlMock).not.toHaveBeenCalled();
    });

    it('does NOT open dialpad for callto: link when isTelephonyEnabled=false', async () => {
      setupDeepLinks();

      selectMock.mockImplementation((selector: any) =>
        selector({
          isTelephonyEnabled: false,
          servers: [{ url: 'https://chat.example.com', title: 'Chat' }],
        })
      );

      const savedArgv = process.argv;
      process.argv = ['electron', '.', 'callto:+491234567890'];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(getWebContentsByServerUrlMock).not.toHaveBeenCalled();
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });

    it('opens dialpad for tel: link when isTelephonyEnabled=true', async () => {
      setupDeepLinks();

      selectMock.mockImplementation((selector: any) =>
        selector({
          isTelephonyEnabled: true,
          servers: [{ url: 'https://chat.example.com', title: 'Chat' }],
        })
      );

      const savedArgv = process.argv;
      process.argv = ['electron', '.', 'tel:+491234567890'];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(getWebContentsByServerUrlMock).toHaveBeenCalledWith(
        'https://chat.example.com'
      );
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'telephony/call-requested',
        {
          phoneNumber: '+491234567890',
          rawUri: 'tel:+491234567890',
        }
      );
    });

    it('does not gate non-telephony deep links on isTelephonyEnabled', async () => {
      setupDeepLinks();

      resolveServerUrlMock.mockResolvedValue([
        'https://chat.example.com',
        ServerUrlResolutionStatus.OK,
        undefined,
      ] as any);

      selectMock.mockImplementation((selector: any) =>
        selector({
          isTelephonyEnabled: false,
          servers: [{ url: 'https://chat.example.com', title: 'Chat' }],
        })
      );

      const savedArgv = process.argv;
      process.argv = [
        'electron',
        '.',
        'rocketchat://auth?host=https://chat.example.com&token=abc&userId=123',
      ];

      await processDeepLinksInArgs();

      process.argv = savedArgv;

      expect(resolveServerUrlMock).toHaveBeenCalled();
    });
  });
});

describe('telephonyPreferredServer reducer', () => {
  it('should return initial state as null', () => {
    expect(
      telephonyPreferredServer(undefined, { type: 'UNKNOWN_ACTION' } as any)
    ).toBe(null);
  });

  it('should set preferred server URL', () => {
    expect(
      telephonyPreferredServer(null, {
        type: TELEPHONY_PREFERRED_SERVER_SET,
        payload: 'https://chat.example.com',
      })
    ).toBe('https://chat.example.com');
  });

  it('should clear preferred server when payload is null', () => {
    expect(
      telephonyPreferredServer('https://chat.example.com', {
        type: TELEPHONY_PREFERRED_SERVER_SET,
        payload: null,
      })
    ).toBe(null);
  });
});
