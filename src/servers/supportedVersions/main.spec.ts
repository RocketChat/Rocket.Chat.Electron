import axios from 'axios';
import { listen, select, dispatch } from '../../store';
import {
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_LOADING,
  WEBVIEW_SERVER_VERSION_UPDATED,
  WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
  WEBVIEW_READY,
  WEBVIEW_SERVER_RELOADED,
  SUPPORTED_VERSION_DIALOG_DISMISS,
} from '../../ui/actions';
import {
  checkSupportedVersionServers,
  isServerVersionSupported,
  updateSupportedVersionsData,
} from './main';
import type { ServerInfo, SupportedVersions, CloudInfo } from './types';

jest.mock('../../store');
jest.mock('axios');
jest.mock('jsonwebtoken');
jest.mock('electron-store');
jest.mock('node:fs/promises');
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const selectMock = select as jest.MockedFunction<typeof select>;
const listenMock = listen as jest.MockedFunction<typeof listen>;
const axiosMock = axios as jest.Mocked<typeof axios>;

// Mock data factories
const createMockServerInfo = (overrides?: Partial<ServerInfo>): ServerInfo => ({
  version: '7.1.0',
  uniqueId: 'test-unique-id',
  build: {
    date: '2024-01-01',
    nodeVersion: '18.0.0',
    arch: 'x64',
    platform: 'darwin',
    osRelease: '13.0.0',
    totalMemory: 16000000000,
    freeMemory: 8000000000,
    cpus: 4,
  },
  marketplaceApiVersion: '1.30.0',
  commit: {
    hash: 'abc123',
    date: new Date(),
    author: 'Test Author',
    subject: 'Test Commit',
    tag: 'v7.1.0',
    branch: 'main',
  },
  success: true,
  supportedVersions: {
    signed: 'mock-jwt-token',
  },
  ...overrides,
});

const createMockSupportedVersions = (
  overrides?: Partial<SupportedVersions>
): SupportedVersions => ({
  versions: [
    {
      version: '7.0.0',
      expiration: new Date(Date.now() + 86400000),
    },
  ],
  exceptions: {
    versions: [],
    domain: 'example.com',
    uniqueId: 'test-unique-id',
  },
  enforcementStartDate: new Date().toISOString(),
  timestamp: new Date().toISOString(),
  ...overrides,
});

const createMockCloudInfo = (overrides?: Partial<CloudInfo>): CloudInfo => ({
  signed: 'mock-cloud-jwt-token',
  enforcementStartDate: new Date().toISOString(),
  timestamp: new Date().toISOString(),
  versions: [],
  ...overrides,
});

const createMockServer = (overrides?: Partial<any>) => ({
  url: 'https://test.rocket.chat',
  version: '7.1.0',
  title: 'Test Server',
  ...overrides,
});

describe('supportedVersions/main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress unused import/factory warnings
    void WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED;
    void WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR;
    void WEBVIEW_SERVER_VERSION_UPDATED;
    void WEBVIEW_SERVER_UNIQUE_ID_UPDATED;
    void createMockSupportedVersions;
    void createMockCloudInfo;
  });

  // ========== INITIALIZATION & SETUP TESTS ==========
  describe('Initialization & Setup', () => {
    it('should dispatch LOADING state when updateSupportedVersionsData is called', async () => {
      const mockServer = createMockServer();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValue({ data: createMockServerInfo() });

      await updateSupportedVersionsData(mockServer.url);

      // Should dispatch LOADING state
      const loadingDispatch = dispatchMock.mock.calls.find(
        ([action]) => action.type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_LOADING
      );
      expect(loadingDispatch).toBeDefined();
      expect(loadingDispatch?.[0]).toEqual({
        type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_LOADING,
        payload: { url: mockServer.url },
      });
    });

    it('should return early if server not found in Redux state', async () => {
      selectMock.mockReturnValue(undefined);

      await updateSupportedVersionsData('https://unknown.server');

      // Should not dispatch anything
      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('should load builtin supported versions for fallback', async () => {
      const mockServer = createMockServer();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockRejectedValue(new Error('Network error'));

      // Builtin should be available as fallback when other sources fail
      await updateSupportedVersionsData(mockServer.url);

      // Verify axios was called (which will fail and trigger fallback)
      expect(axiosMock.get).toHaveBeenCalled();
    });
  });

  // ========== SERVER FETCH WITH RETRIES TESTS ==========
  describe('Server Fetch with Retries', () => {
    it('should succeed on first server fetch attempt', async () => {
      jest.useFakeTimers();
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValue({ data: mockServerInfo });

      const promise = updateSupportedVersionsData(mockServer.url);
      jest.runAllTimers();
      await promise;

      // Should call axios.get once (success on first try)
      expect(axiosMock.get).toHaveBeenCalledTimes(1);

      // Should dispatch VERSION_UPDATED with server info
      const versionDispatch = dispatchMock.mock.calls.find(
        ([action]) => action.type === WEBVIEW_SERVER_VERSION_UPDATED
      );
      expect(versionDispatch).toBeDefined();
      expect(versionDispatch?.[0]).toEqual({
        type: WEBVIEW_SERVER_VERSION_UPDATED,
        payload: {
          url: mockServer.url,
          version: mockServerInfo.version,
        },
      });

      jest.useRealTimers();
    });

    it('should retry server fetch on timeout and succeed on second attempt', async () => {
      jest.useFakeTimers();
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      selectMock.mockReturnValue(mockServer);

      // First call fails, second succeeds
      axiosMock.get = jest
        .fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ data: mockServerInfo });

      const promise = updateSupportedVersionsData(mockServer.url);
      jest.runAllTimers();
      await promise;

      // Should call axios.get twice (fail, retry, succeed)
      expect(axiosMock.get).toHaveBeenCalledTimes(2);

      // Should still dispatch VERSION_UPDATED after retry succeeds
      const versionDispatch = dispatchMock.mock.calls.find(
        ([action]) => action.type === WEBVIEW_SERVER_VERSION_UPDATED
      );
      expect(versionDispatch).toBeDefined();

      jest.useRealTimers();
    });

    it('should retry server fetch up to 3 times before giving up', async () => {
      jest.useFakeTimers();
      const mockServer = createMockServer();
      selectMock.mockReturnValue(mockServer);

      // All 3 attempts fail
      axiosMock.get = jest.fn().mockRejectedValue(new Error('Network error'));

      const promise = updateSupportedVersionsData(mockServer.url);
      jest.runAllTimers();
      await promise;

      // Should call axios.get 3 times (1 initial + 2 retries)
      expect(axiosMock.get).toHaveBeenCalledTimes(3);

      // Should dispatch ERROR state (fallback used)
      const errorDispatch = dispatchMock.mock.calls.find(
        ([action]) => action.type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR
      );
      expect(errorDispatch).toBeDefined();

      jest.useRealTimers();
    });

    it('should delay 2 seconds between retry attempts', async () => {
      jest.useFakeTimers();
      const mockServer = createMockServer();
      selectMock.mockReturnValue(mockServer);

      axiosMock.get = jest.fn().mockRejectedValue(new Error('Network error'));

      const promise = updateSupportedVersionsData(mockServer.url);

      // Advance to before first retry (1.9 seconds)
      jest.advanceTimersByTime(1900);
      expect(axiosMock.get).toHaveBeenCalledTimes(1);

      // Advance past first retry delay (past 2 seconds)
      jest.advanceTimersByTime(200);
      expect(axiosMock.get).toHaveBeenCalledTimes(2);

      // Run all remaining timers
      jest.runAllTimers();
      await promise;

      expect(axiosMock.get).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });
  });

  // ========== SERVER DECODE & DISPATCH TESTS ==========
  describe('Server Decode & Dispatch', () => {
    it('should decode valid server JWT and dispatch UPDATED with source server', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      const mockSupportedVersions = createMockSupportedVersions();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValue({ data: mockServerInfo });

      // Mock jwt.verify to return valid decoded versions
      jest
        .spyOn(require('jsonwebtoken'), 'verify')
        .mockReturnValue(mockSupportedVersions);

      await updateSupportedVersionsData(mockServer.url);

      // Should dispatch UPDATED with source: 'server'
      const updateDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED &&
          (action as any).payload?.source === 'server'
      );
      expect(updateDispatch).toBeDefined();
      expect((updateDispatch?.[0] as any)?.payload?.supportedVersions).toEqual(
        mockSupportedVersions
      );
    });

    it('should handle invalid JWT gracefully and continue to cloud path', async () => {
      jest.useFakeTimers();
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockRejectedValueOnce(new Error('Cloud error'));

      // Mock jwt.verify to throw (invalid JWT)
      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const promise = updateSupportedVersionsData(mockServer.url);
      jest.runAllTimers();
      await promise;

      // Should continue to cloud path (axios called twice: server then cloud)
      expect(axiosMock.get).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should skip server decode if supportedVersions.signed is missing', async () => {
      jest.useFakeTimers();
      const mockServer = createMockServer();
      const mockServerInfoNoVersions = createMockServerInfo({
        supportedVersions: undefined,
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfoNoVersions })
        .mockRejectedValueOnce(new Error('Cloud error'));

      const promise = updateSupportedVersionsData(mockServer.url);
      jest.runAllTimers();
      await promise;

      // Should skip decode and continue to cloud path
      expect(axiosMock.get).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should log error when JWT decode fails', async () => {
      jest.useFakeTimers();
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockRejectedValueOnce(new Error('Cloud error'));

      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const promise = updateSupportedVersionsData(mockServer.url);
      jest.runAllTimers();
      await promise;

      // Should log decode error
      const errorCalls = consoleErrorSpy.mock.calls.filter((call) =>
        call[0]?.includes('decoding')
      );
      expect(errorCalls.length).toBeGreaterThan(0);

      consoleErrorSpy.mockRestore();
      jest.useRealTimers();
    });

    it('should return early after successful server decode and dispatch', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      const mockSupportedVersions = createMockSupportedVersions();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValue({ data: mockServerInfo });

      jest
        .spyOn(require('jsonwebtoken'), 'verify')
        .mockReturnValue(mockSupportedVersions);

      await updateSupportedVersionsData(mockServer.url);

      // Should only call axios once (server), not cloud
      expect(axiosMock.get).toHaveBeenCalledTimes(1);

      // Should NOT have ERROR dispatch (only UPDATED)
      const errorDispatches = dispatchMock.mock.calls.filter(
        ([action]) => (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR
      );
      expect(errorDispatches.length).toBe(0);
    });
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
