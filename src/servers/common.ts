export type Server = {
  url: string;
  title?: string;
  badge?: '•' | number;
  favicon?: string | null;
  style?: {
    background: string | null;
    color: string | null;
  };
  lastPath?: string;
  failed?: boolean;
  webContentsId?: number;
};

export const enum ServerUrlResolutionStatus {
  OK = 'ok',
  INVALID_URL = 'invalid-url',
  TIMEOUT = 'timeout',
  INVALID = 'invalid',
}

export type ServerUrlResolutionResult = (
  [resolvedServerUrl: Server['url'], result: ServerUrlResolutionStatus.OK]
  | [
    resolvedServerUrl: Server['url'],
    result: Exclude<ServerUrlResolutionStatus, 'OK'>,
    error: Error,
  ]
);
