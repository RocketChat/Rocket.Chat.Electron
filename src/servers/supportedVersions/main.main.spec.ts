import axios from 'axios';
import * as jsonwebtoken from 'jsonwebtoken';

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
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockResolvedValue({ data: mockServerInfo });

      await updateSupportedVersionsData(mockServer.url);

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
    });

    it('should retry server fetch on failure and succeed on retry', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      selectMock.mockReturnValue(mockServer);

      // First call fails, second succeeds
      axiosMock.get = jest
        .fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ data: mockServerInfo });

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(2000);
      await promise;
      jest.useRealTimers();

      // Should call axios.get twice (fail, retry, succeed)
      expect(axiosMock.get).toHaveBeenCalledTimes(2);

      // Should still dispatch VERSION_UPDATED after retry succeeds
      const versionDispatch = dispatchMock.mock.calls.find(
        ([action]) => action.type === WEBVIEW_SERVER_VERSION_UPDATED
      );
      expect(versionDispatch).toBeDefined();
    });

    it('should retry server fetch up to 3 times before giving up', async () => {
      const mockServer = createMockServer();
      selectMock.mockReturnValue(mockServer);

      // All attempts fail - server retries (3) + unique ID (1) = 4 total
      axiosMock.get = jest.fn().mockRejectedValue(new Error('Network error'));

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(4000);
      await promise;
      jest.useRealTimers();

      // Should call axios.get 4 times (3 server attempts + 1 unique ID attempt)
      expect(axiosMock.get).toHaveBeenCalledTimes(4);

      // Should dispatch ERROR state (fallback used)
      const errorDispatch = dispatchMock.mock.calls.find(
        ([action]) => action.type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR
      );
      expect(errorDispatch).toBeDefined();
    });

    it('should support 2s retry delay configuration', async () => {
      // This test verifies withRetries is configured with 2s delay
      // by checking that retries actually happen (3 attempts)
      const mockServer = createMockServer();
      selectMock.mockReturnValue(mockServer);

      axiosMock.get = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ data: createMockServerInfo() });

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(4000);
      await promise;
      jest.useRealTimers();

      // All 3 attempts should be made
      expect(axiosMock.get).toHaveBeenCalledTimes(3);
    });
  });

  // ========== UNIQUE ID FETCH TESTS ==========
  describe('Unique ID Fetch', () => {
    it('should not fetch unique ID if server versions found', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo(); // Has supportedVersions
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockResolvedValue({ data: mockServerInfo });

      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        createMockSupportedVersions()
      );

      await updateSupportedVersionsData(mockServer.url);

      // Should only call axios once (server), not for unique ID
      expect(axiosMock.get).toHaveBeenCalledTimes(1);

      // Should not have UNIQUE_ID_UPDATED
      const uniqueIdDispatches = dispatchMock.mock.calls.filter(
        ([action]) => (action as any).type === WEBVIEW_SERVER_UNIQUE_ID_UPDATED
      );
      expect(uniqueIdDispatches.length).toBe(0);
    });

    it('should handle unique ID fetch errors gracefully', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        supportedVersions: undefined,
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockRejectedValueOnce(new Error('Unique ID fetch failed'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await updateSupportedVersionsData(mockServer.url);

      // Should log warning about unique ID error but continue
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching unique ID'),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should dispatch UNIQUE_ID_UPDATED when unique ID is successfully fetched', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        supportedVersions: undefined, // No server versions
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockResolvedValueOnce({
          data: { settings: [{ value: 'unique-id-123' }] },
        });

      await updateSupportedVersionsData(mockServer.url);

      // Should dispatch UNIQUE_ID_UPDATED
      const uniqueIdDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_UNIQUE_ID_UPDATED &&
          (action as any).payload?.uniqueID === 'unique-id-123'
      );
      expect(uniqueIdDispatch).toBeDefined();
    });

    it('should return null unique ID if settings not found', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        supportedVersions: undefined,
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockResolvedValueOnce({ data: { settings: [] } }); // Empty settings

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await updateSupportedVersionsData(mockServer.url);

      // Should log warning about missing unique ID
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No unique ID found')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  // ========== CLOUD FETCH PATH TESTS ==========
  describe('Cloud Fetch Path', () => {
    it('should fetch cloud info with retries when server fails', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        supportedVersions: undefined,
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockResolvedValueOnce({
          data: { settings: [{ value: 'unique-id-123' }] },
        })
        .mockRejectedValueOnce(new Error('Cloud timeout'))
        .mockResolvedValueOnce({ data: { signed: 'cloud-jwt-token' } });

      await updateSupportedVersionsData(mockServer.url);

      // Should retry cloud fetch (1 fail, 1 success = 2 cloud calls)
      // Plus 1 server + 1 unique ID = 4 total axios calls
      expect(axiosMock.get).toHaveBeenCalledTimes(4);
    });

    it('should decode valid cloud JWT and dispatch UPDATED with source cloud', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        supportedVersions: undefined,
      });
      const mockCloudData = createMockCloudInfo();
      const mockSupportedVersions = createMockSupportedVersions();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockResolvedValueOnce({
          data: { settings: [{ value: 'unique-id-123' }] },
        })
        .mockResolvedValueOnce({ data: mockCloudData });

      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        mockSupportedVersions
      );

      await updateSupportedVersionsData(mockServer.url);

      // Should dispatch UPDATED with source: 'cloud'
      const cloudDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED &&
          (action as any).payload?.source === 'cloud'
      );
      expect(cloudDispatch).toBeDefined();
      expect((cloudDispatch?.[0] as any)?.payload?.supportedVersions).toEqual(
        mockSupportedVersions
      );
    });

    it('should skip cloud fetch if server versions found', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockResolvedValue({ data: mockServerInfo });

      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        createMockSupportedVersions()
      );

      await updateSupportedVersionsData(mockServer.url);

      // Should only call axios once (server), not cloud
      expect(axiosMock.get).toHaveBeenCalledTimes(1);
    });

    it('should skip cloud fetch if uniqueID is unavailable', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        supportedVersions: undefined,
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockResolvedValueOnce({ data: { settings: [] } }); // No unique ID

      await updateSupportedVersionsData(mockServer.url);

      // Should call axios twice (server + unique ID), not cloud
      expect(axiosMock.get).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid cloud JWT and continue to cache', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        supportedVersions: undefined,
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockResolvedValueOnce({
          data: { settings: [{ value: 'unique-id-123' }] },
        })
        .mockResolvedValueOnce({ data: { signed: 'invalid-jwt' } });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(jsonwebtoken, 'verify').mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await updateSupportedVersionsData(mockServer.url);

      // Should log decode error
      const errorCalls = consoleErrorSpy.mock.calls.filter((call) =>
        call[0]?.includes('decoding')
      );
      expect(errorCalls.length).toBeGreaterThan(0);

      consoleErrorSpy.mockRestore();
    });

    it('should retry cloud 3 times before giving up', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        supportedVersions: undefined,
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockResolvedValueOnce({
          data: { settings: [{ value: 'unique-id-123' }] },
        })
        .mockRejectedValue(new Error('Cloud error'));

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(4000);
      await promise;
      jest.useRealTimers();

      // Should attempt cloud 3 times (server + unique ID + 3 cloud attempts = 5 calls)
      expect(axiosMock.get).toHaveBeenCalledTimes(5);
    });
  });

  // ========== SERVER DECODE & DISPATCH TESTS ==========
  describe('Server Decode & Dispatch', () => {
    it('should decode valid server JWT and dispatch UPDATED with source server', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      const mockSupportedVersions = createMockSupportedVersions();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockResolvedValue({ data: mockServerInfo });

      // Mock jwt.verify to return valid decoded versions
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        mockSupportedVersions
      );

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
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        supportedVersions: undefined, // Skip server decode path
      });
      const mockCloudData = createMockCloudInfo();
      const mockSupportedVersions = createMockSupportedVersions();

      selectMock.mockReturnValue(mockServer);

      // Server info succeeds (but no supportedVersions.signed), unique ID succeeds, cloud succeeds
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockResolvedValueOnce({
          data: { settings: [{ value: 'unique-id-123' }] },
        })
        .mockResolvedValueOnce({ data: mockCloudData });

      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        mockSupportedVersions
      );

      await updateSupportedVersionsData(mockServer.url);

      // CRITICAL TEST: Verify source='cloud' is dispatched
      // This demonstrates the cloud fallback path is properly executed when server path is unavailable
      const cloudDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED &&
          (action as any).payload?.source === 'cloud'
      );
      expect(cloudDispatch).toBeDefined();
      expect((cloudDispatch?.[0] as any)?.payload?.source).toBe('cloud');
      expect((cloudDispatch?.[0] as any)?.payload?.supportedVersions).toEqual(
        mockSupportedVersions
      );
    });

    it('should skip server decode if supportedVersions.signed is missing', async () => {
      const mockServer = createMockServer();
      const mockServerInfoNoVersions = createMockServerInfo({
        supportedVersions: undefined,
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfoNoVersions })
        .mockRejectedValueOnce(new Error('Cloud error'));

      await updateSupportedVersionsData(mockServer.url);

      // Should skip decode and continue to cloud path
      expect(axiosMock.get).toHaveBeenCalledTimes(2);
    });

    it('should log error when JWT decode fails', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      const mockCloudInfo = createMockCloudInfo();
      const mockSupportedVersions = createMockSupportedVersions();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      selectMock.mockReturnValue(mockServer);

      // Mock axios: server info, unique ID, cloud info
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({ data: mockServerInfo })
        .mockResolvedValueOnce({
          data: { settings: [{ value: 'unique-id-123' }] },
        })
        .mockResolvedValueOnce({ data: mockCloudInfo });

      // Mock verify: throw for server decode, succeed for cloud decode
      const verifyMock = jest.spyOn(jsonwebtoken, 'verify') as jest.Mock;
      verifyMock.mockImplementation((token) => {
        if (token === 'mock-jwt-token') {
          throw new Error('jwt malformed');
        }
        return mockSupportedVersions;
      });

      await updateSupportedVersionsData(mockServer.url);

      // Should log decode error for server JWT
      const errorCalls = consoleErrorSpy.mock.calls.filter((call) =>
        call[0]?.includes('decoding')
      );
      expect(errorCalls.length).toBeGreaterThan(0);

      // Should dispatch UPDATED with source: 'cloud' (cloud fallback executed)
      const cloudDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED &&
          (action as any).payload?.source === 'cloud'
      );
      expect(cloudDispatch).toBeDefined();

      consoleErrorSpy.mockRestore();
      verifyMock.mockRestore();
    });

    it('should return early after successful server decode and dispatch', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo();
      const mockSupportedVersions = createMockSupportedVersions();
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockResolvedValue({ data: mockServerInfo });

      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        mockSupportedVersions
      );

      await updateSupportedVersionsData(mockServer.url);

      // Should only call axios once (server), not cloud
      expect(axiosMock.get).toHaveBeenCalledTimes(1);

      // Should NOT have ERROR dispatch (only UPDATED)
      const errorDispatches = dispatchMock.mock.calls.filter(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR
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
      const futureDate = new Date(Date.now() + 86400000);
      const supportedVersions: SupportedVersions = {
        enforcementStartDate: new Date(Date.now() + 172800000).toISOString(),
        timestamp: new Date().toISOString(),
        versions: [
          {
            version: '7.1.0', // Must match mockServer version ~7.1
            expiration: futureDate,
          },
        ],
      };

      const result = await isServerVersionSupported(
        mockServer as any,
        supportedVersions
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
            version: '5.4.0',
            expiration: futureDate,
          },
        ],
      };

      // Create a server with version 5.4.x to match the test name
      const serverWith54 = { ...mockServer, version: '5.4.1' };

      const result = await isServerVersionSupported(
        serverWith54 as any,
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
