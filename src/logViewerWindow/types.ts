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
  context: string;
  message: string;
  raw: string;
}

export interface IReadLogsResponse {
  success: boolean;
  logs?: string;
  filePath?: string;
  fileName?: string;
  isDefaultLog?: boolean;
  lastModifiedTime?: number;
  totalEntries?: number;
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
