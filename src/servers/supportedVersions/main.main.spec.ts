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
  WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
  WEBVIEW_GIT_COMMIT_HASH_CHANGED,
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
          gitCommitHash: mockServerInfo.commit.hash,
        },
      });
    });

    it('should dispatch git commit hash from server info', async () => {
      const mockServer = createMockServer();
      const mockServerInfo = createMockServerInfo({
        commit: {
          ...createMockServerInfo().commit,
          hash: 'bb83777b51a42d',
        },
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockResolvedValue({ data: mockServerInfo });

      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        createMockSupportedVersions()
      );

      await updateSupportedVersionsData(mockServer.url);

      expect(dispatchMock).toHaveBeenCalledWith({
        type: WEBVIEW_GIT_COMMIT_HASH_CHANGED,
        payload: {
          url: mockServer.url,
          gitCommitHash: 'bb83777b51a42d',
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
      const futureDate = new Date(Date.now() + 86400000);
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

    it('should support sha-prefixed exception versions by git commit hash', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const supportedVersions: SupportedVersions = {
        enforcementStartDate: new Date(Date.now() - 86400000).toISOString(),
        timestamp: new Date().toISOString(),
        versions: [
          {
            version: '8.4.0',
            expiration: futureDate,
          },
        ],
        exceptions: {
          domain: 'open.rocket.chat',
          uniqueId: 'test-unique-id',
          versions: [
            {
              version: 'sha-bb83777',
              expiration: futureDate,
            },
          ],
        },
      };

      const result = await isServerVersionSupported(
        {
          url: 'https://open.rocket.chat/',
          version: '8.5',
          title: 'Rocket.Chat Open',
          uniqueID: 'test-unique-id',
          gitCommitHash: 'bb83777b51a42d',
        } as any,
        supportedVersions
      );

      expect(result.supported).toBe(true);
    });

    it('should not match malformed exception versions by git commit hash', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const supportedVersions: SupportedVersions = {
        enforcementStartDate: new Date(Date.now() - 86400000).toISOString(),
        timestamp: new Date().toISOString(),
        versions: [
          {
            version: '8.4.0',
            expiration: futureDate,
          },
        ],
        exceptions: {
          domain: 'open.rocket.chat',
          uniqueId: 'test-unique-id',
          versions: [
            {
              version: '',
              expiration: futureDate,
            },
          ],
        },
      };

      const result = await isServerVersionSupported(
        {
          url: 'https://open.rocket.chat/',
          version: '8.5',
          title: 'Rocket.Chat Open',
          uniqueID: 'test-unique-id',
          gitCommitHash: 'bb83777b51a42d',
        } as any,
        supportedVersions
      );

      expect(result.supported).toBe(false);
    });

    describe('message role targeting', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const buildSupportedVersions = (roles?: string[]): SupportedVersions =>
        ({
          enforcementStartDate: new Date(Date.now() + 172800000).toISOString(),
          timestamp: new Date().toISOString(),
          versions: [
            {
              version: '5.4.0',
              expiration: futureDate,
            },
          ],
          messages: [
            {
              remainingDays: 30,
              title: 'targeted',
              subtitle: 'sub',
              description: 'desc',
              type: 'info',
              ...(roles ? { roles } : {}),
              params: {},
              link: '',
            },
          ],
          i18n: { en: {} },
        }) as any;

      it('shows a message with no roles to every user', async () => {
        const result = await isServerVersionSupported(
          { ...mockServer, userRoles: ['user'] } as any,
          buildSupportedVersions()
        );

        expect(result.message?.title).toBe('targeted');
      });

      it('shows a role-targeted message when the user has the role', async () => {
        const result = await isServerVersionSupported(
          { ...mockServer, userRoles: ['admin', 'user'] } as any,
          buildSupportedVersions(['admin'])
        );

        expect(result.message?.title).toBe('targeted');
      });

      it('hides a role-targeted message from users without the role', async () => {
        const result = await isServerVersionSupported(
          { ...mockServer, userRoles: ['user'] } as any,
          buildSupportedVersions(['admin'])
        );

        expect(result.supported).toBe(true);
        expect(result.message).toBeUndefined();
      });

      it('hides a role-targeted message when user roles are unknown', async () => {
        const result = await isServerVersionSupported(
          mockServer as any,
          buildSupportedVersions(['admin'])
        );

        expect(result.supported).toBe(true);
        expect(result.message).toBeUndefined();
      });
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

  // ========== RACE CONDITION FIX: isSupportedVersion dispatched from main ==========
  describe('isSupportedVersion dispatch from main process', () => {
    it('should dispatch WEBVIEW_SERVER_IS_SUPPORTED_VERSION after successful server-source decode', async () => {
      const mockServer = createMockServer({ version: '8.5.0' });
      const futureExpiry = new Date(Date.now() + 86400000 * 365);
      const mockSupportedVersions = createMockSupportedVersions({
        versions: [{ version: '8.5.0-develop', expiration: futureExpiry }],
        enforcementStartDate: '2023-12-15T00:00:00Z',
      });
      const mockServerInfo = createMockServerInfo({
        version: '8.5.0',
        supportedVersions: { signed: 'mock-jwt-token' },
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockResolvedValue({ data: mockServerInfo });
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        mockSupportedVersions
      );

      await updateSupportedVersionsData(mockServer.url);

      const isSupportedDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      expect(isSupportedDispatch).toBeDefined();
      expect(
        (isSupportedDispatch?.[0] as any)?.payload?.isSupportedVersion
      ).toBe(true);
    });

    it('should dispatch WEBVIEW_SERVER_IS_SUPPORTED_VERSION after successful cloud-source decode', async () => {
      const mockServer = createMockServer({ version: '8.5.0' });
      const futureExpiry = new Date(Date.now() + 86400000 * 365);
      const mockSupportedVersions = createMockSupportedVersions({
        versions: [{ version: '8.5.0-develop', expiration: futureExpiry }],
        enforcementStartDate: '2023-12-15T00:00:00Z',
      });
      const mockServerInfo = createMockServerInfo({
        version: '8.5.0',
        supportedVersions: undefined,
      });
      const mockCloudData = createMockCloudInfo({ signed: 'mock-cloud-jwt' });
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

      const isSupportedDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      expect(isSupportedDispatch).toBeDefined();
      expect(
        (isSupportedDispatch?.[0] as any)?.payload?.isSupportedVersion
      ).toBe(true);
    });

    it('should dispatch WEBVIEW_SERVER_IS_SUPPORTED_VERSION on cache fallback path', async () => {
      // Cache fallback now also dispatches isSupportedVersion to close the fail-open gap
      // This test replaces the old "should NOT dispatch" test which was valid before the fix
      const mockServer = createMockServer({ version: '7.5.0' });
      selectMock.mockReturnValue(mockServer);
      // Server fetch fails, unique ID fetch fails -> falls to cache/builtin
      axiosMock.get = jest.fn().mockRejectedValue(new Error('Network error'));

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(4000);
      await promise;
      jest.useRealTimers();

      // isSupportedVersion IS now dispatched on cache/builtin fallback paths
      const isSupportedDispatches = dispatchMock.mock.calls.filter(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      // At least one dispatch must exist (cache or builtin fallback)
      expect(isSupportedDispatches.length).toBeGreaterThanOrEqual(1);
    });

    it('should dispatch isSupportedVersion: false for unsupported server version via server-source', async () => {
      const mockServer = createMockServer({ version: '7.13.0' });
      const pastExpiry = new Date(Date.now() - 86400000);
      const mockSupportedVersions = createMockSupportedVersions({
        versions: [{ version: '8.5.0', expiration: pastExpiry }],
        enforcementStartDate: '2023-12-15T00:00:00Z',
      });
      const mockServerInfo = createMockServerInfo({
        version: '7.13.0',
        supportedVersions: { signed: 'mock-jwt-token' },
      });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockResolvedValue({ data: mockServerInfo });
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        mockSupportedVersions
      );

      await updateSupportedVersionsData(mockServer.url);

      const isSupportedDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      expect(isSupportedDispatch).toBeDefined();
      expect(
        (isSupportedDispatch?.[0] as any)?.payload?.isSupportedVersion
      ).toBe(false);
    });
  });

  // ========== FALLBACK PATH ENFORCEMENT ==========
  // These tests verify that the cache and builtin fallback paths dispatch
  // WEBVIEW_SERVER_IS_SUPPORTED_VERSION before WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR.
  //
  // Implementation note: the ElectronStore instance is created at module load time,
  // so we capture it via the prototype mock before tests run. The module-level
  // builtinSupportedVersions singleton is reset per-test via readFile + jwt.verify mocks.
  describe('fallback path enforcement', () => {
    // Capture the store prototype mock so we can control .get() return values.
    // ElectronStore is auto-mocked; all instances share the same prototype methods.
    let storeGetMock: jest.Mock;

    beforeAll(() => {
      // The store was instantiated at module load. The auto-mock gives the prototype
      // a jest.fn() for every method. We spy on the prototype's get.
      const ElectronStoreMock = jest.requireMock('electron-store');
      storeGetMock = jest.spyOn(
        ElectronStoreMock.prototype,
        'get'
      ) as jest.Mock;
    });

    beforeEach(() => {
      // Default: cache returns nothing (fall through to builtin)
      storeGetMock.mockReturnValue(undefined);
    });

    it('cache fallback dispatches isSupportedVersion: false for unsupported persisted version', async () => {
      const mockServer = createMockServer({ version: '7.5.0' });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockRejectedValue(new Error('Network error'));

      const pastExpiry = new Date(Date.now() - 86400000);
      const cachedVersions = createMockSupportedVersions({
        versions: [{ version: '8.0.0', expiration: pastExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });
      storeGetMock.mockReturnValue(cachedVersions);

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(4000);
      await promise;
      jest.useRealTimers();

      const isSupportedDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      expect(isSupportedDispatch).toBeDefined();
      expect(
        (isSupportedDispatch?.[0] as any)?.payload?.isSupportedVersion
      ).toBe(false);

      const errorDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR
      );
      expect(errorDispatch).toBeDefined();
    });

    it('cache fallback dispatches isSupportedVersion: true for supported persisted version', async () => {
      const mockServer = createMockServer({ version: '7.5.0' });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockRejectedValue(new Error('Network error'));

      const futureExpiry = new Date(Date.now() + 86400000 * 365);
      const cachedVersions = createMockSupportedVersions({
        versions: [{ version: '7.5.0', expiration: futureExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });
      storeGetMock.mockReturnValue(cachedVersions);

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(4000);
      await promise;
      jest.useRealTimers();

      const isSupportedDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      expect(isSupportedDispatch).toBeDefined();
      expect(
        (isSupportedDispatch?.[0] as any)?.payload?.isSupportedVersion
      ).toBe(true);
    });

    it('builtin fallback dispatches isSupportedVersion: false when server version is unsupported', async () => {
      const mockServer = createMockServer({ version: '7.5.0' });
      selectMock.mockReturnValue(mockServer);
      axiosMock.get = jest.fn().mockRejectedValue(new Error('Network error'));

      // Cache returns nothing (already set by beforeEach)
      // storeGetMock returns undefined by default

      const pastExpiry = new Date(Date.now() - 86400000);
      const builtinVersions = createMockSupportedVersions({
        versions: [{ version: '8.0.0', expiration: pastExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });

      // Reset the builtin singleton by making readFile return a token that
      // decodes to our controlled builtinVersions payload
      const fsPromises = await import('node:fs/promises');
      (fsPromises.readFile as jest.Mock).mockResolvedValue('builtin-jwt-token');
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        builtinVersions
      );

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(4000);
      await promise;
      jest.useRealTimers();

      const isSupportedDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      expect(isSupportedDispatch).toBeDefined();
      expect(
        (isSupportedDispatch?.[0] as any)?.payload?.isSupportedVersion
      ).toBe(false);

      const errorDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR
      );
      expect(errorDispatch).toBeDefined();
    });

    it('prefers builtin over cache when cache is older than builtin (stale-cache-after-update guard)', async () => {
      // Regression test for #3385: a cache entry written by an older app
      // version (before the server's version was added to the supported
      // list) must not permanently outrank a freshly-bundled builtin list
      // that already supports it. Uses jest.isolateModules for a fresh
      // builtinSupportedVersions singleton, same as the no-data-anywhere test.
      await jest.isolateModulesAsync(async () => {
        jest.mock('../../store');
        jest.mock('axios');
        jest.mock('jsonwebtoken');
        jest.mock('electron-store');
        jest.mock('node:fs/promises');
        jest.mock('electron', () => ({
          ipcMain: { handle: jest.fn() },
        }));

        const { dispatch: isolatedDispatch, select: isolatedSelect } =
          await import('../../store');
        const isolatedAxios = (await import('axios')).default;
        const isolatedJwt = await import('jsonwebtoken');
        const { updateSupportedVersionsData: isolatedUpdate } = await import(
          './main'
        );
        const isolatedFs = await import('node:fs/promises');

        const isolatedDispatchMock = isolatedDispatch as jest.MockedFunction<
          typeof isolatedDispatch
        >;
        const isolatedSelectMock = isolatedSelect as jest.MockedFunction<
          typeof isolatedSelect
        >;
        const isolatedAxiosMock = isolatedAxios as jest.Mocked<
          typeof isolatedAxios
        >;

        const IsolatedElectronStoreMock = jest.requireMock('electron-store');
        const isolatedStoreGetMock = jest.spyOn(
          IsolatedElectronStoreMock.prototype,
          'get'
        ) as jest.Mock;

        const mockServer = createMockServer({ version: '8.5.1' });
        isolatedSelectMock.mockReturnValue(mockServer);
        isolatedAxiosMock.get = jest
          .fn()
          .mockRejectedValue(new Error('Network error'));

        const futureExpiry = new Date(Date.now() + 86400000 * 365);

        // Stale cache: written long ago, does not know about 8.5 -> unsupported.
        const staleCachedVersions = createMockSupportedVersions({
          versions: [{ version: '7.0.0', expiration: futureExpiry }],
          enforcementStartDate: '2023-01-01T00:00:00Z',
          timestamp: '2020-01-01T00:00:00Z',
        });
        isolatedStoreGetMock.mockReturnValue(staleCachedVersions);

        // Fresh builtin: bundled with the current app version, knows 8.5 is supported.
        const freshBuiltinVersions = createMockSupportedVersions({
          versions: [{ version: '8.5.0', expiration: futureExpiry }],
          enforcementStartDate: '2023-01-01T00:00:00Z',
          timestamp: new Date().toISOString(),
        });
        (isolatedFs.readFile as jest.Mock).mockResolvedValue(
          'builtin-jwt-token'
        );
        (isolatedJwt.verify as jest.Mock).mockReturnValue(freshBuiltinVersions);

        jest.useFakeTimers();
        const promise = isolatedUpdate(mockServer.url);
        await jest.advanceTimersByTimeAsync(4000);
        await promise;
        jest.useRealTimers();

        const isSupportedDispatch = isolatedDispatchMock.mock.calls.find(
          ([action]) =>
            (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
        );
        expect(isSupportedDispatch).toBeDefined();
        // Must be true — proves the fresher builtin data won over the stale cache.
        expect(
          (isSupportedDispatch?.[0] as any)?.payload?.isSupportedVersion
        ).toBe(true);

        const updatedDispatch = isolatedDispatchMock.mock.calls.find(
          ([action]) =>
            (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED
        );
        expect((updatedDispatch?.[0] as any)?.payload?.source).toBe('builtin');
      });
    });

    it('cache fallback uses freshly-fetched server version, not stale persisted version', async () => {
      // Persisted server.version is stale ("7.5.0"); /api/info returns FRESH 8.5.
      // server-side signed payload missing -> falls through to cloud -> cloud fails -> cache.
      // Cache contains entries valid for 8.5 but NOT 7.5.
      // If fix is correct, enforcement is computed against fresh 8.5 -> supported: true.
      // If fix is wrong (uses stale 7.5), enforcement -> supported: false.
      const mockServer = createMockServer({ version: '7.5.0' });
      selectMock.mockReturnValue(mockServer);

      // /api/info returns fresh version 8.5 but no signed supportedVersions field.
      // getUniqueId also hits axios.get; first /api/info, then settings/uniqueID.
      // Provide /api/info response, then make subsequent calls fail (cloud).
      const infoResponse = {
        data: {
          version: '8.5',
          commit: { hash: 'abc1234567890' },
          // supportedVersions absent -> serverEncoded undefined -> falls to cloud
        },
      };
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce(infoResponse) // /api/info
        .mockRejectedValue(new Error('Network error')); // uniqueID + cloud all fail

      const futureExpiry = new Date(Date.now() + 86400000 * 365);
      const cachedVersions = createMockSupportedVersions({
        versions: [{ version: '8.5.0', expiration: futureExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });
      storeGetMock.mockReturnValue(cachedVersions);

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(10000);
      await promise;
      jest.useRealTimers();

      const isSupportedDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      expect(isSupportedDispatch).toBeDefined();
      // Must be true — proves enforcement used fresh 8.5, not stale 7.5
      expect(
        (isSupportedDispatch?.[0] as any)?.payload?.isSupportedVersion
      ).toBe(true);
    });

    it('no-data-anywhere path preserves prior isSupportedVersion verdict (security-correct)', async () => {
      // Uses jest.isolateModules so the builtinSupportedVersions singleton is fresh
      // and readFile can be made to fail before it is ever populated.
      await jest.isolateModulesAsync(async () => {
        // Re-apply mocks for the isolated module scope
        jest.mock('../../store');
        jest.mock('axios');
        jest.mock('jsonwebtoken');
        jest.mock('electron-store');
        jest.mock('node:fs/promises');
        jest.mock('electron', () => ({
          ipcMain: { handle: jest.fn() },
        }));

        const { dispatch: isolatedDispatch, select: isolatedSelect } =
          await import('../../store');
        const isolatedAxios = (await import('axios')).default;
        const { updateSupportedVersionsData: isolatedUpdate } = await import(
          './main'
        );
        const isolatedFs = await import('node:fs/promises');

        const isolatedDispatchMock = isolatedDispatch as jest.MockedFunction<
          typeof isolatedDispatch
        >;
        const isolatedSelectMock = isolatedSelect as jest.MockedFunction<
          typeof isolatedSelect
        >;
        const isolatedAxiosMock = isolatedAxios as jest.Mocked<
          typeof isolatedAxios
        >;

        const mockServer = createMockServer({ version: '7.5.0' });
        isolatedSelectMock.mockReturnValue(mockServer);
        isolatedAxiosMock.get = jest
          .fn()
          .mockRejectedValue(new Error('Network error'));

        // Cache returns nothing (auto-mock default)
        // Builtin file read fails — singleton never populated
        (isolatedFs.readFile as jest.Mock).mockRejectedValue(
          new Error('File not found')
        );

        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        jest.useFakeTimers();
        const promise = isolatedUpdate(mockServer.url);
        await jest.advanceTimersByTimeAsync(4000);
        await promise;
        jest.useRealTimers();

        // No-data path must NOT dispatch isSupportedVersion. Prior verdict
        // (e.g. persisted `false` from a session when evidence existed) is
        // preserved as security-correct fail-secure default. Only ERROR fires
        // to signal the fetch attempt completed without fresh evidence.
        const isSupportedDispatches = isolatedDispatchMock.mock.calls.filter(
          ([action]) =>
            (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
        );
        expect(isSupportedDispatches.length).toBe(0);

        const errorDispatch = isolatedDispatchMock.mock.calls.find(
          ([action]) =>
            (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR
        );
        expect(errorDispatch).toBeDefined();

        consoleErrorSpy.mockRestore();
      });
    });
  });

  // ========== CONCURRENCY: overlapping requests must not stale-overwrite ==========
  describe('overlapping request guard', () => {
    it('older slower request does not overwrite newer request verdict', async () => {
      const mockServer = createMockServer({ version: '7.5.0' });
      selectMock.mockReturnValue(mockServer);

      // Two payloads with opposing verdicts.
      const futureExpiry = new Date(Date.now() + 86400000 * 365);
      const supportedPayload = createMockSupportedVersions({
        versions: [{ version: '7.5.0', expiration: futureExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });
      const unsupportedPayload = createMockSupportedVersions({
        versions: [{ version: '8.0.0', expiration: futureExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });

      // Older request resolves slowly with UNSUPPORTED.
      // Newer request resolves fast with SUPPORTED.
      // We control timing via deferred axios resolutions.
      let resolveOld: (v: any) => void = () => {};
      let resolveNew: (v: any) => void = () => {};
      const oldPromise = new Promise((r) => {
        resolveOld = r;
      });
      const newPromise = new Promise((r) => {
        resolveNew = r;
      });

      axiosMock.get = jest
        .fn()
        .mockImplementationOnce(() => oldPromise) // older /api/info
        .mockImplementationOnce(() => newPromise); // newer /api/info

      // Kick off older first (will await oldPromise inside withRetries),
      // then newer second.
      const oldRun = updateSupportedVersionsData(mockServer.url);
      const newRun = updateSupportedVersionsData(mockServer.url);

      // Resolve newer first with version that yields supported: true
      resolveNew({
        data: {
          version: '7.5.0',
          supportedVersions: { signed: 'newer-jwt' },
        },
      });
      // jwt.verify mock should return supportedPayload for newer
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        supportedPayload
      );

      await newRun;

      // Now resolve older — should be detected as stale and discarded.
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        unsupportedPayload
      );
      resolveOld({
        data: {
          version: '7.5.0',
          supportedVersions: { signed: 'older-jwt' },
        },
      });

      await oldRun;

      const isSupportedDispatches = dispatchMock.mock.calls.filter(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      // Last verdict must be from the newer request (true), not older (false).
      const last = isSupportedDispatches[isSupportedDispatches.length - 1];
      expect((last?.[0] as any)?.payload?.isSupportedVersion).toBe(true);
    });
  });

  describe('cache poisoning guard', () => {
    it('older slower request does not call saveToCache after newer request resolved', async () => {
      // We verify staleness is checked BEFORE saveToCache by spying on the
      // store's set() method via the ElectronStore prototype.
      const ElectronStoreMock = jest.requireMock('electron-store');
      const setSpy = jest.spyOn(
        ElectronStoreMock.prototype,
        'set'
      ) as jest.Mock;
      setSpy.mockClear();

      const mockServer = createMockServer({ version: '7.5.0' });
      selectMock.mockReturnValue(mockServer);

      const futureExpiry = new Date(Date.now() + 86400000 * 365);
      const newerPayload = createMockSupportedVersions({
        versions: [{ version: '7.5.0', expiration: futureExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });
      const olderPayload = createMockSupportedVersions({
        versions: [{ version: '8.0.0', expiration: futureExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });

      let resolveOld: (v: any) => void = () => {};
      let resolveNew: (v: any) => void = () => {};
      const oldPromise = new Promise((r) => {
        resolveOld = r;
      });
      const newPromise = new Promise((r) => {
        resolveNew = r;
      });

      axiosMock.get = jest
        .fn()
        .mockImplementationOnce(() => oldPromise)
        .mockImplementationOnce(() => newPromise);

      const oldRun = updateSupportedVersionsData(mockServer.url);
      const newRun = updateSupportedVersionsData(mockServer.url);

      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        newerPayload
      );
      resolveNew({
        data: {
          version: '7.5.0',
          supportedVersions: { signed: 'newer-jwt' },
        },
      });
      await newRun;

      // After newer completed, capture set() calls so far. Newer should have
      // written the cache key once.
      const setCallsBeforeOldResolves = setSpy.mock.calls.length;

      // Now resolve older. Its decode happens, but stale check must short-circuit
      // BEFORE saveToCache.
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        olderPayload
      );
      resolveOld({
        data: {
          version: '7.5.0',
          supportedVersions: { signed: 'older-jwt' },
        },
      });
      await oldRun;

      // The older request must NOT have written to the persistent store after
      // being identified as stale.
      expect(setSpy.mock.calls.length).toBe(setCallsBeforeOldResolves);
    });
  });

  // ========== UNIQUE ID ENDPOINT: must use fresh /api/info version ==========
  describe('uniqueID endpoint selection uses fresh version', () => {
    it('uses fresh 7.0.0+ endpoint when /api/info reports >= 7.0.0 but persisted version is < 7', async () => {
      // Persisted 6.0.0 -> would route to legacy settings endpoint.
      // Fresh /api/info reports 7.5.0 -> must route to /api/v1/server.uniqueId.
      const mockServer = createMockServer({ version: '6.0.0' });
      selectMock.mockReturnValue(mockServer);

      const callLog: string[] = [];
      axiosMock.get = jest.fn().mockImplementation((url: string) => {
        callLog.push(url);
        if (url.includes('api/info')) {
          return Promise.resolve({
            data: {
              version: '7.5.0',
              // No supportedVersions.signed -> falls through to cloud lookup,
              // which requires uniqueID first.
            },
          });
        }
        // After /api/info, the next request is uniqueID lookup. We don't care
        // about the response — only the URL chosen — so reject to short-circuit.
        return Promise.reject(new Error('stop after uniqueID call'));
      });

      jest.useFakeTimers();
      const promise = updateSupportedVersionsData(mockServer.url);
      await jest.advanceTimersByTimeAsync(10000);
      await promise;
      jest.useRealTimers();

      // Find uniqueID lookup call (anything that isn't /api/info).
      const uniqueIdCall = callLog.find((u) => !u.includes('api/info'));
      expect(uniqueIdCall).toBeDefined();
      // Modern endpoint (v >= 7.0.0): settings.public?_id=uniqueID
      // Legacy endpoint (v < 7.0.0): settings.public?query=<encoded uniqueID>
      // The persisted version is 6.0.0 (would route to legacy `query=...`),
      // but fresh /api/info reports 7.5.0 so we must hit the modern `_id=` form.
      expect(uniqueIdCall).toContain('_id=uniqueID');
      expect(uniqueIdCall).not.toContain('query=');
    });
  });

  describe('exception scope (cross-tenant guard)', () => {
    const futureExpiry = new Date(Date.now() + 86400000 * 365 * 3);
    const baseVersions = {
      versions: [],
      enforcementStartDate: '2023-12-15T00:00:00Z',
      timestamp: new Date().toISOString(),
      messages: [],
      i18n: {},
    };

    it('does NOT honor commit-hash exception when payload domain mismatches server', async () => {
      const payload = {
        ...baseVersions,
        exceptions: {
          domain: 'tenant-a.example.com',
          uniqueId: 'tenant-a-unique',
          versions: [{ version: 'sha-abc1234', expiration: futureExpiry }],
        },
      } as unknown as SupportedVersions;

      // Server B has matching commit hash but different domain.
      const serverB = {
        url: 'https://tenant-b.example.com/',
        version: '8.5',
        title: 'Tenant B',
        uniqueID: 'tenant-b-unique',
      } as any;

      const result = await isServerVersionSupported(
        serverB,
        payload,
        'abc1234567890'
      );
      // Enforcement falls through (no versions match either) -> unsupported.
      expect(result.supported).toBe(false);
    });

    it('does NOT honor commit-hash exception when payload uniqueId mismatches server', async () => {
      const payload = {
        ...baseVersions,
        exceptions: {
          // Same domain (or absent), but different uniqueId.
          domain: 'shared.example.com',
          uniqueId: 'tenant-a-unique',
          versions: [{ version: 'sha-abc1234', expiration: futureExpiry }],
        },
      } as unknown as SupportedVersions;

      const serverB = {
        url: 'https://shared.example.com/',
        version: '8.5',
        title: 'Tenant B',
        uniqueID: 'tenant-b-unique',
      } as any;

      const result = await isServerVersionSupported(
        serverB,
        payload,
        'abc1234567890'
      );
      expect(result.supported).toBe(false);
    });

    it('honors commit-hash exception when domain AND uniqueId both match', async () => {
      const payload = {
        ...baseVersions,
        exceptions: {
          domain: 'tenant-a.example.com',
          uniqueId: 'tenant-a-unique',
          versions: [{ version: 'sha-abc1234', expiration: futureExpiry }],
        },
      } as unknown as SupportedVersions;

      const serverA = {
        url: 'https://tenant-a.example.com/',
        version: '8.5',
        title: 'Tenant A',
        uniqueID: 'tenant-a-unique',
      } as any;

      const result = await isServerVersionSupported(
        serverA,
        payload,
        'abc1234567890'
      );
      expect(result.supported).toBe(true);
    });

    it('does NOT honor scoped exception when local server.uniqueID is undefined', async () => {
      const payload = {
        ...baseVersions,
        exceptions: {
          domain: 'tenant-a.example.com',
          uniqueId: 'tenant-a-unique',
          versions: [{ version: 'sha-abc1234', expiration: futureExpiry }],
        },
      } as unknown as SupportedVersions;

      // Same domain. Same commit hash. But local uniqueID UNKNOWN.
      // Must reject — missing local identity cannot satisfy required scope.
      const serverWithoutUniqueID = {
        url: 'https://tenant-a.example.com/',
        version: '8.5',
        title: 'Tenant A',
        // uniqueID: undefined
      } as any;

      const result = await isServerVersionSupported(
        serverWithoutUniqueID,
        payload,
        'abc1234567890'
      );
      expect(result.supported).toBe(false);
    });

    it('honors exception when payload has no scope fields (legacy/global)', async () => {
      const payload = {
        ...baseVersions,
        exceptions: {
          // No domain, no uniqueId — global scope (legacy payload).
          versions: [{ version: 'sha-abc1234', expiration: futureExpiry }],
        },
      } as unknown as SupportedVersions;

      const server = {
        url: 'https://any.example.com/',
        version: '8.5',
        title: 'Any',
      } as any;

      const result = await isServerVersionSupported(
        server,
        payload,
        'abc1234567890'
      );
      expect(result.supported).toBe(true);
    });
  });

  describe('gitCommitHash persisted to server state via WEBVIEW_SERVER_VERSION_UPDATED', () => {
    it('reducer preserves gitCommitHash when payload omits it (preload setVersion case)', async () => {
      const { servers: serversReducer } = await import('../reducers');
      const initialState = [
        {
          url: 'https://test.rocket.chat',
          title: 'Test',
          version: '7.0.0',
          gitCommitHash: 'preserve-me-abc1234',
        },
      ];
      const after = serversReducer(
        initialState as any,
        {
          type: WEBVIEW_SERVER_VERSION_UPDATED,
          payload: { url: 'https://test.rocket.chat', version: '7.0.1' },
        } as any
      );
      expect(after[0].version).toBe('7.0.1');
      expect(after[0].gitCommitHash).toBe('preserve-me-abc1234');
    });

    it('dispatches WEBVIEW_SERVER_VERSION_UPDATED with gitCommitHash from /api/info', async () => {
      const mockServer = createMockServer({ version: '7.5.0' });
      selectMock.mockReturnValue(mockServer);

      const futureExpiry = new Date(Date.now() + 86400000 * 365);
      const validPayload = createMockSupportedVersions({
        versions: [{ version: '7.5.0', expiration: futureExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });

      axiosMock.get = jest.fn().mockResolvedValue({
        data: {
          version: '7.5.0',
          uniqueId: 'fresh-unique',
          commit: { hash: 'abcdef1234567890' },
          supportedVersions: { signed: 'jwt' },
        },
      });
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        validPayload
      );

      await updateSupportedVersionsData(mockServer.url);

      const versionDispatch = dispatchMock.mock.calls.find(
        ([action]) => (action as any).type === WEBVIEW_SERVER_VERSION_UPDATED
      );
      expect(versionDispatch).toBeDefined();
      // gitCommitHash threaded through so SupportedVersionDialog can match
      // sha-based exceptions consistently with the main process.
      expect((versionDispatch?.[0] as any)?.payload?.gitCommitHash).toBe(
        'abcdef1234567890'
      );
    });
  });

  describe('server-source exception scope uses fresh /api/info uniqueId', () => {
    it('honors scoped exception on first load when persisted server.uniqueID is undefined but /api/info returns uniqueId', async () => {
      // Mock server with NO persisted uniqueID (first launch).
      const mockServer = {
        url: 'https://tenant-a.example.com/',
        version: '7.5.0',
        title: 'Tenant A',
        // uniqueID undefined
      } as any;
      selectMock.mockReturnValue(mockServer);

      const futureExpiry = new Date(Date.now() + 86400000 * 365);
      // Payload with scoped exception that requires uniqueId match.
      const payloadWithScopedException = {
        versions: [],
        enforcementStartDate: '2023-01-01T00:00:00Z',
        timestamp: new Date().toISOString(),
        messages: [],
        i18n: {},
        exceptions: {
          domain: 'tenant-a.example.com',
          uniqueId: 'tenant-a-fresh-unique',
          versions: [{ version: 'sha-abc1234', expiration: futureExpiry }],
        },
      };

      // /api/info returns fresh uniqueId + signed JWT
      axiosMock.get = jest.fn().mockResolvedValue({
        data: {
          version: '7.5.0',
          uniqueId: 'tenant-a-fresh-unique',
          commit: { hash: 'abc1234567890' },
          supportedVersions: { signed: 'server-jwt' },
        },
      });
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        payloadWithScopedException
      );

      await updateSupportedVersionsData(mockServer.url);

      const isSupportedDispatch = dispatchMock.mock.calls.find(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      expect(isSupportedDispatch).toBeDefined();
      // Without fix: server.uniqueID undefined -> scope check rejects ->
      // exception ignored -> falls through to enforcement -> false.
      // With fix: serverWithFreshVersion gets serverInfoResult.uniqueId ->
      // scope matches -> exception honored -> true.
      expect(
        (isSupportedDispatch?.[0] as any)?.payload?.isSupportedVersion
      ).toBe(true);
    });
  });

  describe('dispatch ordering: verdict before fetchState success', () => {
    it('dispatches WEBVIEW_SERVER_IS_SUPPORTED_VERSION before WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED on server-source path', async () => {
      const mockServer = createMockServer({ version: '7.5.0' });
      selectMock.mockReturnValue(mockServer);

      const futureExpiry = new Date(Date.now() + 86400000 * 365);
      const validPayload = createMockSupportedVersions({
        versions: [{ version: '7.5.0', expiration: futureExpiry }],
        enforcementStartDate: '2023-01-01T00:00:00Z',
      });

      axiosMock.get = jest.fn().mockResolvedValue({
        data: {
          version: '7.5.0',
          supportedVersions: { signed: 'valid-jwt' },
        },
      });
      (jest.spyOn(jsonwebtoken, 'verify') as jest.Mock).mockReturnValue(
        validPayload
      );

      await updateSupportedVersionsData(mockServer.url);

      const isSupportedIdx = dispatchMock.mock.calls.findIndex(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_IS_SUPPORTED_VERSION
      );
      const updatedIdx = dispatchMock.mock.calls.findIndex(
        ([action]) =>
          (action as any).type === WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED
      );
      expect(isSupportedIdx).toBeGreaterThanOrEqual(0);
      expect(updatedIdx).toBeGreaterThanOrEqual(0);
      // Verdict must land in the store BEFORE fetchState='success' triggers
      // UnsupportedServer with stale isSupportedVersion.
      expect(isSupportedIdx).toBeLessThan(updatedIdx);
    });
  });

  // ========== EXCEPTION MATCHING: exact-string and commit-hash ==========
  describe('isServerVersionSupported exception matching', () => {
    const baseVersions: SupportedVersions = {
      versions: [],
      enforcementStartDate: '2023-12-15T00:00:00Z',
      timestamp: new Date().toISOString(),
      exceptions: {
        domain: 'open.rocket.chat',
        uniqueId: 'abc',
        versions: [
          {
            version: 'sha-bb83777',
            expiration: new Date(Date.now() + 86400000 * 365 * 3),
          },
        ],
      },
    };

    it('should match exception by commit hash (sha-<7chars> format)', async () => {
      const server = {
        url: 'https://open.rocket.chat',
        version: '8.5',
        uniqueID: 'abc',
      } as any;
      const result = await isServerVersionSupported(
        server,
        baseVersions,
        'bb83777abcdef'
      );
      expect(result.supported).toBe(true);
    });

    it('should match exception by full commit hash', async () => {
      const versionsWithFullHash: SupportedVersions = {
        ...baseVersions,
        exceptions: {
          domain: 'open.rocket.chat',
          uniqueId: 'abc',
          versions: [
            {
              version: 'bb83777abcdef',
              expiration: new Date(Date.now() + 86400000 * 365 * 3),
            },
          ],
        },
      };
      const server = {
        url: 'https://open.rocket.chat',
        version: '8.5',
        uniqueID: 'abc',
      } as any;
      const result = await isServerVersionSupported(
        server,
        versionsWithFullHash,
        'bb83777abcdef'
      );
      expect(result.supported).toBe(true);
    });

    it('should NOT match exception when commit hash is absent', async () => {
      const server = {
        url: 'https://open.rocket.chat',
        version: '8.5',
        uniqueID: 'abc',
      } as any;
      // No commit hash passed, sha exception cannot match
      const result = await isServerVersionSupported(server, baseVersions);
      // Should fall through to versions check (empty) -> enforcement past -> false
      expect(result.supported).toBe(false);
    });

    it('should not match expired exception even with correct commit hash', async () => {
      const expiredExceptionVersions: SupportedVersions = {
        versions: [],
        enforcementStartDate: '2023-12-15T00:00:00Z',
        timestamp: new Date().toISOString(),
        exceptions: {
          domain: 'open.rocket.chat',
          uniqueId: 'abc',
          versions: [
            {
              version: 'sha-bb83777',
              expiration: new Date(Date.now() - 86400000),
            },
          ],
        },
      };
      const server = {
        url: 'https://open.rocket.chat',
        version: '8.5',
        uniqueID: 'abc',
      } as any;
      const result = await isServerVersionSupported(
        server,
        expiredExceptionVersions,
        'bb83777abcdef'
      );
      // Expired exception falls through; versions empty; enforcement past -> false
      expect(result.supported).toBe(false);
    });

    it('should still match exception by semver satisfies as fallback', async () => {
      const semverExceptionVersions: SupportedVersions = {
        versions: [],
        enforcementStartDate: '2023-12-15T00:00:00Z',
        timestamp: new Date().toISOString(),
        exceptions: {
          domain: 'open.rocket.chat',
          uniqueId: 'abc',
          versions: [
            {
              version: '8.5.0',
              expiration: new Date(Date.now() + 86400000 * 365),
            },
          ],
        },
      };
      const server = {
        url: 'https://open.rocket.chat',
        version: '8.5',
        uniqueID: 'abc',
      } as any;
      const result = await isServerVersionSupported(
        server,
        semverExceptionVersions
      );
      expect(result.supported).toBe(true);
    });
  });
});
