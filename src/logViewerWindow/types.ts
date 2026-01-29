/**
 * Type definitions for Log Viewer window
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'verbose';

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

// Type aliases for backward compatibility
export type LogEntryType = ILogEntryType;
export type ReadLogsResponse = IReadLogsResponse;
export type SaveLogsResponse = ISaveLogsResponse;
export type SelectFileResponse = ISelectFileResponse;
export type ClearLogsResponse = IClearLogsResponse;

/**
 * Type guard for validating LogLevel
 */
export const isLogLevel = (value: string): value is LogLevel => {
  return ['debug', 'info', 'warn', 'error', 'verbose'].includes(
    value.toLowerCase()
  );
};

/**
 * Safely parse a log level string, defaulting to 'info' if invalid
 */
export const parseLogLevel = (value: string): LogLevel => {
  const trimmed = value.trim().toLowerCase();
  return isLogLevel(trimmed) ? trimmed : 'info';
};
