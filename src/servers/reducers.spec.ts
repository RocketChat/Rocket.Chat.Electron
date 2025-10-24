import {
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_VERSION_CHECK_FAILED,
  WEBVIEW_SERVER_VERSION_UPDATED,
} from '../ui/actions';
import type { Server } from './common';
import { servers } from './reducers';
import { mockSupportedVersions } from './supportedVersions/__fixtures__/mockData';

describe('servers reducer', () => {
  describe('WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED', () => {
    it('should store as last known good and reset failure count', () => {
      const initialState: Server[] = [
        {
          url: 'https://test.com',
          versionCheckFailureCount: 2,
        },
      ];

      const action = {
        type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
        payload: {
          url: 'https://test.com',
          supportedVersions: mockSupportedVersions,
          source: 'server' as const,
        },
      } as const;

      const newState = servers(initialState, action);

      expect(newState[0].supportedVersions).toEqual(mockSupportedVersions);
      expect(newState[0].lastKnownGoodSupportedVersions).toEqual(
        mockSupportedVersions
      );
      expect(newState[0].versionCheckFailureCount).toBe(0);
      expect(newState[0].lastSuccessfulVersionCheck).toBeDefined();
      expect(newState[0].lastSuccessfulVersionCheck).toBeInstanceOf(Date);
    });

    it('should preserve other server properties', () => {
      const initialState: Server[] = [
        {
          url: 'https://test.com',
          title: 'Test Server',
          version: '7.7.0',
          versionCheckFailureCount: 1,
        },
      ];

      const action = {
        type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
        payload: {
          url: 'https://test.com',
          supportedVersions: mockSupportedVersions,
          source: 'cloud' as const,
        },
      } as const;

      const newState = servers(initialState, action);

      expect(newState[0].title).toBe('Test Server');
      expect(newState[0].version).toBe('7.7.0');
    });

    it('should add server if not exists', () => {
      const initialState: Server[] = [];

      const action = {
        type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
        payload: {
          url: 'https://test.com',
          supportedVersions: mockSupportedVersions,
          source: 'builtin' as const,
        },
      } as const;

      const newState = servers(initialState, action);

      expect(newState.length).toBe(1);
      expect(newState[0].url).toBe('https://test.com');
      expect(newState[0].supportedVersions).toEqual(mockSupportedVersions);
    });
  });

  describe('WEBVIEW_SERVER_VERSION_CHECK_FAILED', () => {
    it('should increment failure count', () => {
      const initialState: Server[] = [
        {
          url: 'https://test.com',
          versionCheckFailureCount: 1,
        },
      ];

      const action = {
        type: WEBVIEW_SERVER_VERSION_CHECK_FAILED,
        payload: { url: 'https://test.com' },
      } as const;

      const newState = servers(initialState, action);

      expect(newState[0].versionCheckFailureCount).toBe(2);
      expect(newState[0].lastVersionCheckAttempt).toBeDefined();
      expect(newState[0].lastVersionCheckAttempt).toBeInstanceOf(Date);
    });

    it('should initialize failure count to 1 for new failures', () => {
      const initialState: Server[] = [
        {
          url: 'https://test.com',
        },
      ];

      const action = {
        type: WEBVIEW_SERVER_VERSION_CHECK_FAILED,
        payload: { url: 'https://test.com' },
      } as const;

      const newState = servers(initialState, action);

      expect(newState[0].versionCheckFailureCount).toBe(1);
      expect(newState[0].lastVersionCheckAttempt).toBeDefined();
    });

    it('should handle multiple failures', () => {
      let state: Server[] = [
        {
          url: 'https://test.com',
        },
      ];

      const action = {
        type: WEBVIEW_SERVER_VERSION_CHECK_FAILED,
        payload: { url: 'https://test.com' },
      } as const;

      // Apply action three times
      state = servers(state, action);
      state = servers(state, action);
      state = servers(state, action);

      expect(state[0].versionCheckFailureCount).toBe(3);
    });

    it('should preserve last known good data on failure', () => {
      const initialState: Server[] = [
        {
          url: 'https://test.com',
          lastKnownGoodSupportedVersions: mockSupportedVersions,
          lastKnownGoodVersion: '7.7.0',
        },
      ];

      const action = {
        type: WEBVIEW_SERVER_VERSION_CHECK_FAILED,
        payload: { url: 'https://test.com' },
      } as const;

      const newState = servers(initialState, action);

      expect(newState[0].lastKnownGoodSupportedVersions).toEqual(
        mockSupportedVersions
      );
      expect(newState[0].lastKnownGoodVersion).toBe('7.7.0');
    });
  });

  describe('WEBVIEW_SERVER_VERSION_UPDATED', () => {
    it('should save version as last known good', () => {
      const initialState: Server[] = [{ url: 'https://test.com' }];

      const action = {
        type: WEBVIEW_SERVER_VERSION_UPDATED,
        payload: {
          url: 'https://test.com',
          version: '7.7.0',
        },
      } as const;

      const newState = servers(initialState, action);

      expect(newState[0].version).toBe('7.7.0');
      expect(newState[0].lastKnownGoodVersion).toBe('7.7.0');
    });

    it('should update version when server already exists', () => {
      const initialState: Server[] = [
        {
          url: 'https://test.com',
          version: '7.6.0',
          lastKnownGoodVersion: '7.6.0',
        },
      ];

      const action = {
        type: WEBVIEW_SERVER_VERSION_UPDATED,
        payload: {
          url: 'https://test.com',
          version: '7.7.0',
        },
      } as const;

      const newState = servers(initialState, action);

      expect(newState[0].version).toBe('7.7.0');
      expect(newState[0].lastKnownGoodVersion).toBe('7.7.0');
    });
  });

  describe('integration: failure and recovery cycle', () => {
    it('should handle failure followed by successful update', () => {
      let state: Server[] = [
        {
          url: 'https://test.com',
          versionCheckFailureCount: 0,
          lastKnownGoodSupportedVersions: mockSupportedVersions,
        },
      ];

      // Fail twice
      const failAction = {
        type: WEBVIEW_SERVER_VERSION_CHECK_FAILED,
        payload: { url: 'https://test.com' },
      } as const;

      state = servers(state, failAction);
      state = servers(state, failAction);

      expect(state[0].versionCheckFailureCount).toBe(2);
      expect(state[0].lastKnownGoodSupportedVersions).toEqual(
        mockSupportedVersions
      );

      // Then succeed
      const successAction = {
        type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
        payload: {
          url: 'https://test.com',
          supportedVersions: mockSupportedVersions,
          source: 'server' as const,
        },
      } as const;

      state = servers(state, successAction);

      expect(state[0].versionCheckFailureCount).toBe(0);
      expect(state[0].lastSuccessfulVersionCheck).toBeDefined();
      expect(state[0].lastKnownGoodSupportedVersions).toEqual(
        mockSupportedVersions
      );
    });
  });
});
