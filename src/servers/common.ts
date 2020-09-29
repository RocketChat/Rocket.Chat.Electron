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
};

export const enum ServerUrlResolutionStatus {
  OK = 'ok',
  INVALID_URL = 'invalid-url',
  TIMEOUT = 'timeout',
  INVALID = 'invalid',
}

export type ServerUrlResolutionResult = (
  [resolvedServerUrl: string, result: ServerUrlResolutionStatus.OK]
  | [
    resolvedServerUrl: string,
    result: Exclude<ServerUrlResolutionStatus, 'OK'>,
    error: Error,
  ]
);
