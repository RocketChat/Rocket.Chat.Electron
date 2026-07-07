const logDebug = jest.fn();
const logInfo = jest.fn();
const logWarn = jest.fn();
const logError = jest.fn();

jest.mock('electron-log', () => ({
  debug: (...args: any[]) => logDebug(...args),
  info: (...args: any[]) => logInfo(...args),
  warn: (...args: any[]) => logWarn(...args),
  error: (...args: any[]) => logError(...args),
}));

const getProcessContext = jest.fn();
jest.mock('./context', () => ({
  getProcessContext,
}));

const loadScopes = (processContext: string) => {
  getProcessContext.mockReturnValue(processContext);
  let scopesModule: typeof import('./scopes');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    scopesModule = require('./scopes');
  });
  return scopesModule!;
};

describe('logging/scopes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefixes logs with process context and scope', () => {
    const { createScopedLogger } = loadScopes('main');
    const logger = createScopedLogger('updates');

    logger.info('sync started');

    expect(logInfo).toHaveBeenCalledWith('[main]', '[updates]', 'sync started');
  });

  it('emits all log levels with consistent format', () => {
    const { createScopedLogger } = loadScopes('browser');
    const logger = createScopedLogger('outlook');

    logger.debug('d');
    logger.warn('w');
    logger.error('e');
    logger.info('i');

    expect(logDebug).toHaveBeenCalledWith('[browser]', '[outlook]', 'd');
    expect(logWarn).toHaveBeenCalledWith('[browser]', '[outlook]', 'w');
    expect(logError).toHaveBeenCalledWith('[browser]', '[outlook]', 'e');
    expect(logInfo).toHaveBeenCalledWith('[browser]', '[outlook]', 'i');
  });

  it('exposes shared scoped loggers', () => {
    const { loggers } = loadScopes('worker');

    expect(Object.keys(loggers)).toEqual([
      'main',
      'app',
      'outlook',
      'auth',
      'ipc',
      'ui',
      'updates',
      'notifications',
      'videoCall',
      'servers',
      'logViewer',
    ]);
    loggers.main.info('shared');
    expect(logInfo).toHaveBeenCalledWith('[worker]', '[main]', 'shared');
  });
});

