import { dialog } from 'electron';

import { ServerUrlResolutionStatus } from '../servers/common';
import { resolveServerUrl } from '../servers/main';
import { select, dispatch } from '../store';
import { TELEPHONY_PREFERRED_SERVER_SET } from '../telephony/actions';
import { telephonyPreferredServer } from '../telephony/reducers';
import { getRootWindow } from '../ui/main/rootWindow';
import { getWebContentsByServerUrl } from '../ui/main/serverView';
import {
  parseTelephonyLink,
  performTelephonyCall,
  setupDeepLinks,
  processDeepLinksInArgs,
} from './main';
import type { TelephonyLink } from './main';

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));
jest.mock('electron', () => ({
  app: {
    addListener: jest.fn(),
    isPackaged: false,
    getPath: jest.fn(),
    getName: jest.fn(() => 'Rocket.Chat'),
  },
  dialog: { showMessageBox: jest.fn() },
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
const getWebContentsByServerUrlMock =
  getWebContentsByServerUrl as jest.MockedFunction<
    typeof getWebContentsByServerUrl
  >;
const dialogMock = dialog as jest.Mocked<typeof dialog>;
const resolveServerUrlMock = resolveServerUrl as jest.MockedFunction<
  typeof resolveServerUrl
>;
const getRootWindowMock = getRootWindow as jest.MockedFunction<
  typeof getRootWindow
>;

describe('deepLinks/main.ts', () => {
  const mockRootWindow = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    getRootWindowMock.mockResolvedValue(mockRootWindow);
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
      expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
    });

    it('should auto-select when there is 1 server', async () => {
      selectMock.mockReturnValue([
        { url: 'https://chat.example.com', title: 'Chat' },
      ]);

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
      expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
    });

    it('should show dialog when there are 2+ servers and no preference', async () => {
      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com', title: 'Server 1' },
          { url: 'https://server2.com', title: 'Server 2' },
        ])
        .mockReturnValueOnce(null);

      dialogMock.showMessageBox.mockResolvedValue({
        response: 0,
        checkboxChecked: false,
      } as any);

      await performTelephonyCall(mockLink);

      expect(dialogMock.showMessageBox).toHaveBeenCalledWith(mockRootWindow, {
        type: 'question',
        title: 'dialog.telephonySelectServer.title',
        message: 'dialog.telephonySelectServer.message',
        buttons: ['Server 1', 'Server 2'],
        checkboxLabel: 'dialog.telephonySelectServer.rememberChoice',
        checkboxChecked: false,
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

      expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
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

      dialogMock.showMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: false,
      } as any);

      await performTelephonyCall(mockLink);

      expect(dialogMock.showMessageBox).toHaveBeenCalled();
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

      dialogMock.showMessageBox.mockResolvedValue({
        response: 0,
        checkboxChecked: true,
      } as any);

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

      dialogMock.showMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: false,
      } as any);

      await performTelephonyCall(mockLink);

      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('should use hostname as button label when server title is missing', async () => {
      selectMock
        .mockReturnValueOnce([
          { url: 'https://server1.com' },
          { url: 'https://server2.com' },
        ])
        .mockReturnValueOnce(null);

      dialogMock.showMessageBox.mockResolvedValue({
        response: 0,
        checkboxChecked: false,
      } as any);

      await performTelephonyCall(mockLink);

      expect(dialogMock.showMessageBox).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          buttons: ['server1.com', 'server2.com'],
        })
      );
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
  });

  describe('processDeepLink telephony routing', () => {
    const mockBrowserWindow = {
      isVisible: jest.fn(() => true),
      focus: jest.fn(),
      showInactive: jest.fn(),
    };

    const mockWebContents = {
      send: jest.fn(),
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
      // Telephony dialog NOT shown (telephony branch skipped)
      expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
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
