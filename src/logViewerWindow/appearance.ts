import type { LogLevel } from './types';

export const LEVEL_ACCENT: Record<LogLevel, string> = {
  error: 'var(--rcx-color-status-bullet-busy)',
  warn: 'var(--rcx-color-status-bullet-away)',
  info: 'var(--rcx-color-badge-background-level-2)',
  debug: 'var(--rcx-color-font-hint)',
  verbose: 'var(--rcx-color-font-annotation)',
  silly: 'var(--rcx-color-font-annotation)',
};

export const LEVEL_BADGE_VARIANT: Record<
  LogLevel,
  'danger' | 'warning' | 'primary' | 'secondary' | 'ghost'
> = {
  error: 'danger',
  warn: 'warning',
  info: 'primary',
  debug: 'secondary',
  verbose: 'ghost',
  silly: 'ghost',
};

export const LOG_LEVELS: LogLevel[] = [
  'error',
  'warn',
  'info',
  'debug',
  'verbose',
  'silly',
];
