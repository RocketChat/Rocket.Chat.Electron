export type LogLevel =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'verbose'
  | 'silly';

export interface ILogEntryType {
  id: string;
  timestamp: string;
  level: LogLevel;
  /** Bracketed context tags in the order they were logged. */
  contextTags: string[];
  /** `contextTags` joined with spaces, for free-text search. */
  context: string;
  message: string;
  raw: string;
  /** Lowercased `message` + `context` for filter matching without reallocating. */
  searchText: string;
  /** Lowercased `raw` for full-entry search without reallocating. */
  rawLower: string;
}

export interface IReadLogsResponse {
  success: boolean;
  logs?: string;
  filePath?: string;
  fileName?: string;
  isDefaultLog?: boolean;
  lastModifiedTime?: number;
  fileSize?: number;
  totalEntries?: number;
  error?: string;
}

export interface IReadLogsTailResponse {
  success: boolean;
  logs?: string;
  newSize?: number;
  lastModifiedTime?: number;
  error?: string;
}

export interface ISaveLogsResponse {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export interface ISelectFileResponse {
  success: boolean;
  filePath?: string;
  fileName?: string;
  canceled?: boolean;
  error?: string;
}

export interface IClearLogsResponse {
  success: boolean;
  error?: string;
}

export interface IStatLogResponse {
  success: boolean;
  lastModifiedTime?: number;
  size?: number;
  error?: string;
}

export type LogEntryType = ILogEntryType;
export type ReadLogsResponse = IReadLogsResponse;
export type ReadLogsTailResponse = IReadLogsTailResponse;
export type SaveLogsResponse = ISaveLogsResponse;
export type SelectFileResponse = ISelectFileResponse;
export type ClearLogsResponse = IClearLogsResponse;

export const isLogLevel = (value: unknown): value is LogLevel => {
  if (typeof value !== 'string') return false;
  return ['debug', 'info', 'warn', 'error', 'verbose', 'silly'].includes(
    value.toLowerCase()
  );
};

export const parseLogLevel = (value: unknown): LogLevel => {
  if (typeof value !== 'string') return 'info';
  const trimmed = value.trim().toLowerCase();
  return isLogLevel(trimmed) ? trimmed : 'info';
};

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  silly: 0,
  verbose: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
};

export const isAtLeastLevel = (level: LogLevel, minLevel: LogLevel): boolean =>
  LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
