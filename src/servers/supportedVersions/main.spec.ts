import type { Server } from '../common';
import {
  mockServer,
  mockUnsupportedServer,
  mockSupportedVersions,
  mockServerWithNoData,
} from './__fixtures__/mockData';
import { isServerVersionSupported } from './main';

// Mock file system to avoid import.meta issues
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('mock-jwt-token'),
}));

// Mock jsonwebtoken before importing main
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => mockSupportedVersions),
}));

// Mock the checkManager import
jest.mock('./checkManager', () => ({
  FAILURE_THRESHOLD: 3,
}));

describe('supportedVersions/main', () => {
  describe('isServerVersionSupported', () => {
    it('should return high confidence when no failures', async () => {
      const server: Server = {
        ...mockServer,
        versionCheckFailureCount: 0,
        version: '7.7.0',
      };

      const result = await isServerVersionSupported(
        server,
        mockSupportedVersions
      );

      expect(result.confidence).toBe('high');
      expect(result.supported).toBe(true);
    });

    it('should return medium confidence with some failures', async () => {
      const server: Server = {
        ...mockServer,
        versionCheckFailureCount: 1,
        version: '7.7.0',
      };

      const result = await isServerVersionSupported(
        server,
        mockSupportedVersions
      );

      expect(result.confidence).toBe('medium');
      expect(result.supported).toBe(true);
    });

    it('should return high confidence when unsupported after threshold', async () => {
      const server: Server = {
        ...mockUnsupportedServer,
        versionCheckFailureCount: 3,
        version: '6.0.0',
      };

      const result = await isServerVersionSupported(
        server,
        mockSupportedVersions
      );

      expect(result.confidence).toBe('high');
      expect(result.supported).toBe(false);
    });

    it('should return medium confidence when unsupported before threshold', async () => {
      const server: Server = {
        ...mockUnsupportedServer,
        versionCheckFailureCount: 2,
        version: '6.0.0',
      };

      const result = await isServerVersionSupported(
        server,
        mockSupportedVersions
      );

      expect(result.confidence).toBe('medium');
      expect(result.supported).toBe(false);
    });

    it('should use last known good data when current check has no data', async () => {
      const server: Server = {
        url: 'https://test.com',
        version: '7.7.0',
        lastKnownGoodSupportedVersions: mockSupportedVersions,
        versionCheckFailureCount: 1,
      };

      const result = await isServerVersionSupported(server, undefined);

      expect(result.supported).toBe(true);
      expect(result.confidence).toBe('medium');
    });

    it('should use last known good version when current version missing', async () => {
      const server: Server = {
        url: 'https://test.com',
        version: undefined,
        lastKnownGoodVersion: '7.7.0',
        lastKnownGoodSupportedVersions: mockSupportedVersions,
        versionCheckFailureCount: 0,
      };

      const result = await isServerVersionSupported(
        server,
        mockSupportedVersions
      );

      expect(result.supported).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('should return low confidence when no data and few failures', async () => {
      const server: Server = {
        ...mockServerWithNoData,
        versionCheckFailureCount: 1,
        version: undefined,
      };

      const result = await isServerVersionSupported(server, undefined);

      expect(result.confidence).toBe('low');
      expect(result.supported).toBe(false);
    });

    it('should return high confidence when no data but threshold reached', async () => {
      const server: Server = {
        ...mockServerWithNoData,
        versionCheckFailureCount: 3,
        version: undefined,
      };

      const result = await isServerVersionSupported(server, undefined);

      expect(result.confidence).toBe('high');
      expect(result.supported).toBe(false);
    });

    it('should handle supported versions correctly', async () => {
      const testVersions = [
        { version: '7.11.0', expected: true },
        { version: '7.9.3', expected: true },
        { version: '7.7.0', expected: true },
        { version: '7.6.0', expected: true },
        { version: '6.0.0', expected: false },
        { version: '5.9.9', expected: false },
      ];

      const results = await Promise.all(
        testVersions.map(async ({ version, expected }) => {
          const server: Server = {
            ...mockServer,
            version,
            versionCheckFailureCount: 0,
          };

          const result = await isServerVersionSupported(
            server,
            mockSupportedVersions
          );

          return { result: result.supported, expected };
        })
      );

      results.forEach(({ result, expected }) => {
        expect(result).toBe(expected);
      });
    });

    it('should handle version matching with tilde range', async () => {
      // Version 7.7.9 should match 7.7.0 in supported versions
      const server: Server = {
        ...mockServer,
        version: '7.7.9',
        versionCheckFailureCount: 0,
      };

      const result = await isServerVersionSupported(
        server,
        mockSupportedVersions
      );

      expect(result.supported).toBe(true);
    });

    it('should check expiration dates', async () => {
      const expiredVersions = {
        ...mockSupportedVersions,
        versions: [
          {
            version: '7.7.0',
            expiration: new Date('2020-01-01T00:00:00.000Z'), // Past date
          },
        ],
      };

      const server: Server = {
        ...mockServer,
        version: '7.7.0',
        versionCheckFailureCount: 0,
      };

      const result = await isServerVersionSupported(server, expiredVersions);

      expect(result.supported).toBe(false);
    });

    it('should return expiration message and i18n data', async () => {
      const server: Server = {
        ...mockServer,
        version: '7.7.0',
        versionCheckFailureCount: 0,
      };

      // Create versions with near expiration
      const nearExpirationVersions = {
        ...mockSupportedVersions,
        versions: [
          {
            version: '7.7.0',
            expiration: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          },
        ],
      };

      const result = await isServerVersionSupported(
        server,
        nearExpirationVersions
      );

      expect(result.supported).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.i18n).toBeDefined();
      expect(result.expiration).toBeDefined();
    });
  });
});
