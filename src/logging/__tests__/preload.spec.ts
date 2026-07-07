jest.mock('electron', () => ({
  ipcRenderer: {
    sendSync: jest.fn(),
  },
}));

jest.mock('electron-log/renderer', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../context', () => ({
  getProcessContext: jest.fn(),
  getComponentContext: jest.fn(),
}));

const loadModule = () => {
  jest.resetModules();

  const context = jest.requireMock('../context') as {
    getProcessContext: jest.Mock;
    getComponentContext: jest.Mock;
  };
  const electron = jest.requireMock('electron') as {
    ipcRenderer: { sendSync: jest.Mock };
  };
  const log = jest.requireMock('electron-log/renderer') as {
    default: {
      debug: jest.Mock;
      info: jest.Mock;
      warn: jest.Mock;
      error: jest.Mock;
    };
  };

  const originalLogSpy = jest.fn();
  const originalInfoSpy = jest.fn();
  const originalWarnSpy = jest.fn();
  const originalErrorSpy = jest.fn();
  const originalDebugSpy = jest.fn();

  const original = {
    log: originalLogSpy,
    info: originalInfoSpy,
    warn: originalWarnSpy,
    error: originalErrorSpy,
    debug: originalDebugSpy,
  };

  Object.assign(console, original);

  context.getProcessContext.mockReturnValue('renderer:webview');
  context.getComponentContext.mockImplementation((captureStack = false) =>
    captureStack ? 'ui' : 'general'
  );
  electron.ipcRenderer.sendSync.mockReturnValue('server.example');
  (global as unknown as { window: { location: { origin: string } } }).window = {
    location: { origin: 'https://test.example' },
  };

  require('../preload');

  return { context, electron, log, original };
};

describe('logging/preload', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('overrides console methods with process and server context', () => {
    const { log } = loadModule();

    console.log('hello');
    console.info('info');
    console.warn('warn');
    console.error('error');
    console.debug('debug');

    expect(log.default.debug).toHaveBeenCalledWith('[renderer:webview] [server.example]', 'hello');
    expect(log.default.info).toHaveBeenCalledWith('[renderer:webview] [server.example]', 'info');
    expect(log.default.warn).toHaveBeenCalledWith('[renderer:webview] [server.example] [ui]', 'warn');
    expect(log.default.error).toHaveBeenCalledWith('[renderer:webview] [server.example] [ui]', 'error');
    expect(log.default.debug).toHaveBeenCalledWith('[renderer:webview] [server.example]', 'debug');
    expect((console as any).original).toBeDefined();
  });

  it('falls back to original console methods when context lookup fails', () => {
    const { context, original } = loadModule();
    context.getComponentContext.mockImplementation(() => {
      throw new Error('boom');
    });

    console.log('fallback');
    console.warn('fallback-warn');

    expect(original.log).toHaveBeenCalledWith('fallback');
    expect(original.warn).toHaveBeenCalledWith('fallback-warn');
  });
});
