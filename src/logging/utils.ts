import log from 'electron-log';

/**
 * Utility functions for easier logging across the application
 */

export const logInfo = (message: string, ...args: any[]): void => {
  log.info(message, ...args);
};

export const logError = (
  message: string,
  error?: Error,
  ...args: any[]
): void => {
  if (error) {
    log.error(message, error, ...args);
  } else {
    log.error(message, ...args);
  }
};

export const logWarn = (message: string, ...args: any[]): void => {
  log.warn(message, ...args);
};

export const logDebug = (message: string, ...args: any[]): void => {
  log.debug(message, ...args);
};

/**
 * Log function execution time
 */
export const logExecutionTime = <T>(
  functionName: string,
  fn: () => T | Promise<T>
): T | Promise<T> => {
  const start = Date.now();
  log.debug(`Starting execution of ${functionName}`);

  const result = fn();

  if (result instanceof Promise) {
    return result
      .then((value) => {
        const duration = Date.now() - start;
        log.debug(`Completed execution of ${functionName} in ${duration}ms`);
        return value;
      })
      .catch((error) => {
        const duration = Date.now() - start;
        log.error(
          `Failed execution of ${functionName} in ${duration}ms`,
          error
        );
        throw error;
      });
  }
  const duration = Date.now() - start;
  log.debug(`Completed execution of ${functionName} in ${duration}ms`);
  return result;
};
