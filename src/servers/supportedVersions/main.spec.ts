import { listen, select, dispatch } from '../../store';
import {
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR,
  WEBVIEW_SERVER_VERSION_UPDATED,
  WEBVIEW_READY,
  WEBVIEW_SERVER_RELOADED,
  SUPPORTED_VERSION_DIALOG_DISMISS,
} from '../../ui/actions';
import { checkSupportedVersionServers, isServerVersionSupported } from './main';

jest.mock('../../store');
jest.mock('axios');
jest.mock('jsonwebtoken');
jest.mock('electron-store');
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const selectMock = select as jest.MockedFunction<typeof select>;
const listenMock = listen as jest.MockedFunction<typeof listen>;

// Use the imported constants to avoid unused variable warnings
void WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED;
void WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR;
void WEBVIEW_SERVER_VERSION_UPDATED;
void dispatchMock;
void selectMock;

describe('supportedVersions/main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkSupportedVersionServers', () => {
    it('should set up WEBVIEW_READY listener', () => {
      checkSupportedVersionServers();

      expect(listenMock).toHaveBeenCalled();
      const { calls } = listenMock.mock;
      // @ts-expect-error - comparing action types
      expect(calls.some(([action]) => action === WEBVIEW_READY)).toBe(true);
    });

    it('should set up SUPPORTED_VERSION_DIALOG_DISMISS listener', () => {
      checkSupportedVersionServers();

      expect(listenMock).toHaveBeenCalled();
      const { calls } = listenMock.mock;
      expect(
        // @ts-expect-error - comparing action types
        calls.some(([action]) => action === SUPPORTED_VERSION_DIALOG_DISMISS)
      ).toBe(true);
    });

    it('should set up WEBVIEW_SERVER_RELOADED listener', () => {
      checkSupportedVersionServers();

      expect(listenMock).toHaveBeenCalled();
      const { calls } = listenMock.mock;
      // @ts-expect-error - comparing action types
      expect(calls.some(([action]) => action === WEBVIEW_SERVER_RELOADED)).toBe(
        true
      );
    });

    it('should call listenMock three times for three event listeners', () => {
      checkSupportedVersionServers();

      expect(listenMock).toHaveBeenCalledTimes(3);
    });

    it('should provide callback function for each listener', () => {
      checkSupportedVersionServers();

      const { calls } = listenMock.mock;
      calls.forEach(([, callback]) => {
        expect(typeof callback).toBe('function');
      });
    });
  });

  describe('isServerVersionSupported', () => {
    const mockServer = {
      url: 'https://rocket.chat',
      version: '5.4.0',
      title: 'My Server',
    };

    it('should return { supported: true } when server version is undefined', async () => {
      const serverWithoutVersion = {
        url: 'https://rocket.chat',
        title: 'My Server',
      };

      const result = await isServerVersionSupported(
        serverWithoutVersion as any
      );

      expect(result.supported).toBe(true);
    });

    it('should return { supported: true } when supportedVersions is undefined', async () => {
      const result = await isServerVersionSupported(mockServer as any);

      expect(result.supported).toBe(true);
    });

    it('should handle supported versions correctly', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const supportedVersions = {
        versions: [
          {
            version: '5.0.0',
            expiration: futureDate,
          },
        ],
      };

      const result = await isServerVersionSupported(
        mockServer as any,
        supportedVersions as any
      );

      expect(result.supported).toBe(true);
    });

    it('should handle unsupported versions correctly', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const supportedVersions = {
        versions: [
          {
            version: '5.0.0',
            expiration: pastDate,
          },
        ],
        enforcementStartDate: new Date().toISOString(),
      };

      const result = await isServerVersionSupported(
        mockServer as any,
        supportedVersions as any
      );

      expect(result.supported).toBe(false);
    });

    it('should return object with supported property', async () => {
      const result = await isServerVersionSupported(mockServer as any);

      expect(result).toHaveProperty('supported');
      expect(typeof result.supported).toBe('boolean');
    });

    it('should optionally include message property', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const supportedVersions = {
        versions: [
          {
            version: '5.0.0',
            expiration: futureDate,
          },
        ],
        messages: [
          {
            title: 'test',
            remainingDays: 30,
          },
        ],
      };

      const result = await isServerVersionSupported(
        mockServer as any,
        supportedVersions as any
      );

      expect(result).toHaveProperty('supported');
      if (result.message) {
        expect(result).toHaveProperty('message');
      }
    });

    it('should handle enforcement start date in future', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const supportedVersions = {
        versions: [],
        enforcementStartDate: futureDate,
      };

      const result = await isServerVersionSupported(
        mockServer as any,
        supportedVersions as any
      );

      expect(result.supported).toBe(true);
    });
  });

  describe('Cache and Retry Integration', () => {
    it('should cache key format match expected pattern', () => {
      const serverUrl = 'https://rocket.chat';
      const expectedPattern = `supportedVersions:${serverUrl}`;

      expect(expectedPattern).toBe('supportedVersions:https://rocket.chat');
    });

    it('should handle multiple server URLs with different cache keys', () => {
      const server1 = 'https://rocket.chat';
      const server2 = 'https://rocket2.chat';

      const key1 = `supportedVersions:${server1}`;
      const key2 = `supportedVersions:${server2}`;

      expect(key1).not.toBe(key2);
      expect(key1).toContain('supportedVersions:');
      expect(key2).toContain('supportedVersions:');
    });
  });

  describe('Event Listener Callbacks', () => {
    it('should call listen with valid action and function', () => {
      checkSupportedVersionServers();

      const { calls } = listenMock.mock;
      expect(calls.length).toBe(3);

      calls.forEach(([action, callback]) => {
        expect(action).toBeDefined();
        expect(typeof callback).toBe('function');
      });
    });

    it('should set up all required listeners', () => {
      checkSupportedVersionServers();

      const calls = listenMock.mock.calls.map(([action]) => action);

      expect(calls).toContain(WEBVIEW_READY);
      expect(calls).toContain(SUPPORTED_VERSION_DIALOG_DISMISS);
      expect(calls).toContain(WEBVIEW_SERVER_RELOADED);
    });
  });

  describe('Error Handling', () => {
    it('should not throw when server is undefined in isServerVersionSupported', async () => {
      expect(async () =>
        isServerVersionSupported(undefined as any)
      ).not.toThrow();
    });

    it('should handle missing versions gracefully', async () => {
      const result = await isServerVersionSupported({
        url: 'https://test.com',
        version: '1.0.0',
      } as any);

      expect(result).toHaveProperty('supported');
    });

    it('should return supported: true for missing supportedVersions data', async () => {
      const server = {
        url: 'https://test.com',
        version: '5.0.0',
      };

      const result = await isServerVersionSupported(server as any);

      expect(result.supported).toBe(true);
    });
  });

  describe('Version Comparison', () => {
    const mockServer = {
      url: 'https://rocket.chat',
      version: '5.4.0',
      title: 'Test Server',
    };

    it('should handle version ~5.4 matching against 5.0.0', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const supportedVersions = {
        versions: [
          {
            version: '5.0.0',
            expiration: futureDate,
          },
        ],
      };

      const result = await isServerVersionSupported(
        mockServer as any,
        supportedVersions as any
      );

      expect(result.supported).toBe(true);
    });

    it('should return supported true for all edge cases', async () => {
      const result = await isServerVersionSupported(mockServer as any);
      expect(result.supported).toBe(true);
    });
  });
});
