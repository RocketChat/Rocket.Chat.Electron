import log from 'electron-log';

export interface IScopedLogger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

const scopeToFlagName: Record<string, string> = {
  main: 'isVerboseMainLoggingEnabled',
  app: 'isVerboseAppLoggingEnabled',
  outlook: 'isVerboseOutlookLoggingEnabled',
  auth: 'isVerboseAuthLoggingEnabled',
  ipc: 'isVerboseIpcLoggingEnabled',
  ui: 'isVerboseUiLoggingEnabled',
  updates: 'isVerboseUpdatesLoggingEnabled',
  notifications: 'isVerboseNotificationsLoggingEnabled',
  videoCall: 'isVerboseVideoCallLoggingEnabled',
  servers: 'isVerboseServersLoggingEnabled',
  logViewer: 'isVerboseLogViewerLoggingEnabled',
};

/**
 * Create a scoped logger with a consistent prefix
 * @example
 * const logger = createScopedLogger('outlook');
 * logger.info('Sync started'); // [main] [outlook] Sync started
 */
export const createScopedLogger = (scope: string): IScopedLogger => {
  const scopeStr = `[${scope}]`;
  const flagName = scopeToFlagName[scope];

  const isVerboseEnabled = (): boolean => {
    if (!flagName) return true; // Unknown scopes always log
    return (global as any)[flagName] === true;
  };

  return {
    debug: (...args: any[]) => {
      if (isVerboseEnabled()) log.debug(scopeStr, ...args);
    },
    info: (...args: any[]) => {
      if (isVerboseEnabled()) log.info(scopeStr, ...args);
    },
    warn: (...args: any[]) => {
      if (isVerboseEnabled()) log.warn(scopeStr, ...args);
    },
    error: (...args: any[]) => log.error(scopeStr, ...args),
  };
};

// Pre-defined scopes for common modules
export const loggers = {
  main: createScopedLogger('main'),
  app: createScopedLogger('app'),
  outlook: createScopedLogger('outlook'),
  auth: createScopedLogger('auth'),
  ipc: createScopedLogger('ipc'),
  ui: createScopedLogger('ui'),
  updates: createScopedLogger('updates'),
  notifications: createScopedLogger('notifications'),
  videoCall: createScopedLogger('videoCall'),
  servers: createScopedLogger('servers'),
  logViewer: createScopedLogger('logViewer'),
};
