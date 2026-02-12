import log from 'electron-log';

export interface IScopedLogger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * Create a scoped logger with a consistent prefix
 * @example
 * const logger = createScopedLogger('outlook');
 * logger.info('Sync started'); // [main] [outlook] Sync started
 */
export const createScopedLogger = (scope: string): IScopedLogger => {
  const scopeStr = `[${scope}]`;
  return {
    debug: (...args: any[]) => log.debug(scopeStr, ...args),
    info: (...args: any[]) => log.info(scopeStr, ...args),
    warn: (...args: any[]) => log.warn(scopeStr, ...args),
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
  videoCall: createScopedLogger('videocall'),
  servers: createScopedLogger('servers'),
  logViewer: createScopedLogger('logviewer'),
};
