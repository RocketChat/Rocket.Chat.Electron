import type { Server } from '../../common';
import type { SupportedVersions } from '../types';

export const mockSupportedVersions: SupportedVersions = {
  timestamp: '2025-10-23T14:47:47.633Z',
  enforcementStartDate: '2023-12-15T00:00:00Z',
  messages: [
    {
      remainingDays: 15,
      title: 'version_unsupported_x_days_remaining_title',
      subtitle: 'version_unsupported_x_days_remaining_subtitle',
      description: 'version_unsupported_x_days_remaining_body',
      type: 'warning',
      params: { minimumSupportedVersion: '7.6.0' },
      link: '',
    },
    {
      remainingDays: 1,
      title: 'version_unsupported_final_day_remaining_title',
      subtitle: 'version_unsupported_final_day_subtitle',
      description: 'version_unsupported_final_day_body',
      type: 'danger',
      params: { minimumSupportedVersion: '7.6.0' },
      link: '',
    },
  ],
  versions: [
    {
      version: '7.11.0',
      expiration: new Date('2026-04-30T23:59:59.999Z'),
    },
    {
      version: '7.9.3',
      expiration: new Date('2026-01-31T23:59:59.999Z'),
    },
    {
      version: '7.7.0',
      expiration: new Date('2025-12-31T23:59:59.999Z'),
    },
    {
      version: '7.6.0',
      expiration: new Date('2025-11-30T23:59:59.999Z'),
    },
    {
      version: '7.5.0',
      expiration: new Date('2025-10-31T23:59:59.999Z'),
    },
  ],
  i18n: {
    en: {
      version_unsupported_final_day_body:
        'This workspace is running an unsupported version of Rocket.Chat. Your workspace admin needs to update to at least v{{minimumSupportedVersion}} to prevent cutoff.',
      version_unsupported_final_day_subtitle:
        'Desktop and mobile app access to {{instance_domain}} will be cut off today.',
      version_unsupported_final_day_title: 'Workspace version unsupported',
      version_unsupported_x_days_remaining_body:
        'This workspace is running an unsupported version of Rocket.Chat. Your workspace admin needs to update to at least v{{minimumSupportedVersion}} to prevent cutoff.',
      version_unsupported_x_days_remaining_subtitle:
        'Desktop and mobile app access to {{instance_domain}} will be cut off in {{remaining_days}} day(s).',
      version_unsupported_x_days_remaining_title:
        'Workspace version unsupported',
    },
  },
};

export const mockUnsupportedVersions: SupportedVersions = {
  timestamp: '2025-10-23T14:47:47.633Z',
  enforcementStartDate: '2023-12-15T00:00:00Z',
  messages: mockSupportedVersions.messages,
  versions: [
    {
      version: '7.11.0',
      expiration: new Date('2026-04-30T23:59:59.999Z'),
    },
    {
      version: '7.9.0',
      expiration: new Date('2026-01-31T23:59:59.999Z'),
    },
  ],
  i18n: mockSupportedVersions.i18n,
};

export const mockServer: Server = {
  url: 'https://test.rocketchat.com',
  version: '7.7.0',
  versionCheckFailureCount: 0,
  lastSuccessfulVersionCheck: new Date('2025-10-23T10:00:00Z'),
  supportedVersions: mockSupportedVersions,
  lastKnownGoodSupportedVersions: mockSupportedVersions,
  lastKnownGoodVersion: '7.7.0',
};

export const mockServerWithFailures: Server = {
  url: 'https://test.rocketchat.com',
  version: '7.7.0',
  versionCheckFailureCount: 2,
  lastSuccessfulVersionCheck: new Date('2025-10-23T09:00:00Z'),
  lastVersionCheckAttempt: new Date('2025-10-23T10:00:00Z'),
  supportedVersions: mockSupportedVersions,
  lastKnownGoodSupportedVersions: mockSupportedVersions,
  lastKnownGoodVersion: '7.7.0',
};

export const mockUnsupportedServer: Server = {
  url: 'https://old.rocketchat.com',
  version: '6.0.0',
  versionCheckFailureCount: 0,
  lastSuccessfulVersionCheck: new Date('2025-10-23T10:00:00Z'),
  supportedVersions: mockSupportedVersions,
  lastKnownGoodSupportedVersions: mockSupportedVersions,
  lastKnownGoodVersion: '6.0.0',
};

export const mockServerWithNoData: Server = {
  url: 'https://new.rocketchat.com',
  version: '7.7.0',
  versionCheckFailureCount: 0,
};
