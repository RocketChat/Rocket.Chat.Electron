import type { OutlookCredentials } from '../outlookCalendar/type';
import type { SupportedVersions } from './supportedVersions/types';

export type Server = {
  url: string;
  title?: string;
  pageTitle?: string;
  badge?: '•' | number;
  favicon?: string | null;
  style?: {
    background: string | null;
    color: string | null;
    border: string | null;
  };
  customTheme?: string;
  lastPath?: string;
  failed?: boolean;
  webContentsId?: number;
  userLoggedIn?: boolean;
  gitCommitHash?: string;
  allowedRedirects?: string[];
  outlookCredentials?: OutlookCredentials;
  version?: string;
  uniqueID?: string;
  isSupportedVersion?: boolean;
  supportedVersionsSource?: 'server' | 'cloud' | 'builtin';
  supportedVersions?: SupportedVersions;
  expirationMessageLastTimeShown?: Date;
  documentViewerOpenUrl?: string;
  themeAppearance?: 'dark' | 'light' | 'auto' | 'high-contrast';
};

export const enum ServerUrlResolutionStatus {
  OK = 'ok',
  INVALID_URL = 'invalid-url',
  TIMEOUT = 'timeout',
  INVALID = 'invalid',
}

export type ServerUrlResolutionResult =
  | [resolvedServerUrl: Server['url'], result: ServerUrlResolutionStatus.OK]
  | [
      resolvedServerUrl: Server['url'],
      result: Exclude<ServerUrlResolutionStatus, 'OK'>,
      error: Error,
    ];

export const isServerUrlResolutionResult = (
  obj: unknown
): obj is ServerUrlResolutionResult => {
  if (!Array.isArray(obj)) {
    return false;
  }
  return (
    (obj.length === 3 &&
      typeof obj[0] === 'string' &&
      [
        ServerUrlResolutionStatus.INVALID,
        ServerUrlResolutionStatus.INVALID_URL,
        ServerUrlResolutionStatus.TIMEOUT,
      ].includes(obj[1]) &&
      typeof obj[2] === 'object') ||
    (obj.length === 2 &&
      typeof obj[0] === 'string' &&
      obj[1] === ServerUrlResolutionStatus.OK)
  );
};
