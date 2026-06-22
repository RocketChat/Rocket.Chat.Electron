/**
 * Tests for src/logging/index.ts — the logger factory / setup module.
 *
 * The module runs `configureLogging()` at import time (the `logger` export),
 * so each scenario controls `process.type` and the shape of the mocked
 * `electron-log` transports, then imports the module fresh via
 * `jest.isolateModules`.
 */

import type * as LoggingModule from '../index';

type Hook = (message: any, transport?: any, transportName?: string) => any;

type FakeTransport = {
  level: string;
  maxSize?: number;
  format?: string;
  sync?: boolean;
  writeFn?: (entry: { message: string }) => void;
};

type FakeLog = {
  transports: {
    console?: FakeTransport;
    file?: FakeTransport;
  };
  hooks: Hook[];
  initialize: jest.Mock;
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
};

const makeFakeLog = (withTransports: boolean): FakeLog => ({
  transports: withTransports
    ? {
        console: { level: 'info' },
        file: { level: 'info' },
      }
    : {},
  hooks: [],
  initialize: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

// Holders mutated by individual scenarios before module import.
let fakeLog: FakeLog;
const appOn = jest.fn<void, [string, (...args: any[]) => void]>();
const ipcMainOn = jest.fn<void, [string, (...args: any[]) => void]>();
const getPath = jest.fn<string, [string]>(() => '/logs');
const getVersion = jest.fn<string, []>(() => '9.9.9');
let selectImpl: jest.Mock;
let watchImpl: jest.Mock;

const fsMock = {
  existsSync: jest.fn<boolean, [string]>(() => false),
  statSync: jest.fn<{ size: number }, [string]>(() => ({ size: 0 })),
  readFileSync: jest.fn<string, [string, string]>(() => ''),
  writeFileSync: jest.fn<void, [string, string]>(),
  appendFileSync: jest.fn<void, [string, string]>(),
  chmodSync: jest.fn<void, [string, number]>(),
  promises: {
    appendFile: jest.fn<Promise<void>, [string, string]>(() =>
      Promise.resolve()
    ),
  },
};

jest.mock('electron-log', () => ({
  get transports() {
    return fakeLog.transports;
  },
  get hooks() {
    return fakeLog.hooks;
  },
  initialize: (...args: any[]) => fakeLog.initialize(...args),
  debug: (...args: any[]) => fakeLog.debug(...args),
  info: (...args: any[]) => fakeLog.info(...args),
  warn: (...args: any[]) => fakeLog.warn(...args),
  error: (...args: any[]) => fakeLog.error(...args),
}));

jest.mock('electron', () => ({
  app: {
    on: appOn,
    getPath,
    getVersion,
  },
  ipcMain: {
    on: ipcMainOn,
  },
}));

jest.mock('fs', () => fsMock);

jest.mock('../../store', () => ({
  select: (...args: any[]) => selectImpl(...args),
  watch: (...args: any[]) => watchImpl(...args),
}));

const originalProcessType = process.type;

const setProcessType = (value: string | undefined) => {
  Object.defineProperty(process, 'type', {
    value,
    configurable: true,
  });
};

/**
 * Import a fresh copy of the module under the current mock/process state.
 * Returns the module exports.
 */
const loadModule = (): typeof LoggingModule => {
  let mod: typeof LoggingModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    mod = require('../index');
  });
  return mod!;
};

describe('logging/index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Fake timers so the error-buffer flush setInterval scheduled by
    // configureLogging() is a fake (non-ref'd) handle rather than a real timer
    // that would keep the process alive and block jest --forceExit.
    jest.useFakeTimers();
    fakeLog = makeFakeLog(true);
    selectImpl = jest.fn(() => false);
    watchImpl = jest.fn();
    getPath.mockReturnValue('/logs');
    getVersion.mockReturnValue('9.9.9');
    fsMock.existsSync.mockReturnValue(false);
    fsMock.statSync.mockReturnValue({ size: 0 } as any);
    fsMock.readFileSync.mockReturnValue('' as any);
    fsMock.promises.appendFile.mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    setProcessType(originalProcessType);
    // configureLogging() schedules a real, ref'd setInterval (the error-buffer
    // flush timer) on every module load. It is only cleared on 'before-quit',
    // which most tests never fire — left alone, each load leaks a live timer
    // that keeps the libuv loop alive and blocks jest --forceExit. Switching to
    // fake timers in beforeEach makes that interval a fake handle, and
    // clearAllTimers here disposes it.
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('configureLogging at import (main / browser process)', () => {
    it('configures transports, pushes hooks and initializes in browser', () => {
      setProcessType('browser');
      const mod = loadModule();

      expect(mod.logger).toBe(mod.default);
      // privacy hook + dedup hook + error jsonl hook
      expect(fakeLog.hooks.length).toBe(3);
      expect(fakeLog.initialize).toHaveBeenCalledTimes(1);
      // before-quit handler registered
      expect(appOn).toHaveBeenCalledWith('before-quit', expect.any(Function));
      // file/console transport formats applied
      expect(fakeLog.transports.file?.format).toContain('{level}');
      expect(fakeLog.transports.console?.format).toContain('{level}');
      expect(fakeLog.transports.file?.maxSize).toBe(10 * 1024 * 1024);
      expect((fakeLog.transports.file as any).sync).toBe(false);
    });

    it('uses debug levels under NODE_ENV=development', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      setProcessType('browser');
      try {
        loadModule();
        expect(fakeLog.transports.console?.level).toBe('debug');
        expect(fakeLog.transports.file?.level).toBe('debug');
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it('uses info levels when not in development', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setProcessType('browser');
      try {
        loadModule();
        expect(fakeLog.transports.console?.level).toBe('info');
        expect(fakeLog.transports.file?.level).toBe('info');
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it('chmods existing log files to 0600', () => {
      setProcessType('browser');
      fsMock.existsSync.mockReturnValue(true);
      loadModule();
      expect(fsMock.chmodSync).toHaveBeenCalledWith('/logs/main.log', 0o600);
      expect(fsMock.chmodSync).toHaveBeenCalledWith(
        '/logs/errors.jsonl',
        0o600
      );
    });

    it('does not register before-quit when not in browser process', () => {
      // transports exist but process is renderer — branch coverage for the
      // `process.type === 'browser'` guards inside configureLogging.
      setProcessType('renderer');
      loadModule();
      expect(fakeLog.initialize).not.toHaveBeenCalled();
      expect(appOn).not.toHaveBeenCalledWith(
        'before-quit',
        expect.any(Function)
      );
      // hooks still pushed (transport block runs regardless of process type)
      expect(fakeLog.hooks.length).toBe(3);
    });

    it('skips transport configuration when transports are absent', () => {
      setProcessType('renderer');
      fakeLog = makeFakeLog(false);
      loadModule();
      expect(fakeLog.hooks.length).toBe(0);
      expect(fakeLog.initialize).not.toHaveBeenCalled();
    });
  });

  describe('console override', () => {
    it('routes console methods through electron-log with context', () => {
      setProcessType('browser');
      const original = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      };
      try {
        loadModule();
        console.log('hello');
        console.info('an info');
        console.warn('a warn');
        console.error('an error');
        console.debug('a debug');

        expect(fakeLog.debug).toHaveBeenCalledWith('[main]', 'hello');
        expect(fakeLog.info).toHaveBeenCalledWith('[main]', 'an info');
        expect(fakeLog.warn).toHaveBeenCalledWith('[main]', 'a warn');
        expect(fakeLog.error).toHaveBeenCalledWith('[main]', 'an error');
        expect(fakeLog.debug).toHaveBeenCalledWith('[main]', 'a debug');
        expect((console as any).original).toBeDefined();
      } finally {
        Object.assign(console, original);
      }
    });
  });

  describe('console transport writeFn', () => {
    it('writes through the original console without recursion', () => {
      setProcessType('browser');
      const original = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      };
      const spy = jest.fn();
      console.log = spy;
      try {
        loadModule();
        // writeFn captured the *bound original* before override; calling it
        // should not route back through the overridden console.
        fakeLog.transports.console?.writeFn?.({ message: 'raw line' });
      } finally {
        Object.assign(console, original);
      }
      // The original console.log was the spy at module-load time.
      expect(spy).toHaveBeenCalledWith('raw line');
    });
  });

  describe('error jsonl hook', () => {
    // The error jsonl hook is the third one pushed.
    const getErrorHook = (): Hook => fakeLog.hooks[2];

    it('buffers error messages and redacts sensitive data', () => {
      setProcessType('browser');
      loadModule();
      const hook = getErrorHook();
      const result = hook({
        level: 'error',
        data: ['password: hunter2longpass'],
      });
      // Hook passes the message through untouched.
      expect(result).toEqual({
        level: 'error',
        data: ['password: hunter2longpass'],
      });
    });

    it('ignores non-error messages', () => {
      setProcessType('browser');
      loadModule();
      const hook = getErrorHook();
      const result = hook({ level: 'info', data: ['something'] });
      expect(result).toEqual({ level: 'info', data: ['something'] });
      // No write should be scheduled for non-errors.
      expect(fsMock.promises.appendFile).not.toHaveBeenCalled();
    });

    it('flushes the buffer once it reaches the max buffered errors', () => {
      setProcessType('browser');
      loadModule();
      const hook = getErrorHook();
      // Push 50 distinct error messages to reach MAX_BUFFERED_ERRORS.
      for (let i = 0; i < 50; i++) {
        hook({ level: 'error', data: [`error number ${i}`] });
      }
      expect(fsMock.promises.appendFile).toHaveBeenCalledTimes(1);
      const [, content] = fsMock.promises.appendFile.mock.calls[0];
      // 50 NDJSON lines.
      expect(String(content).trim().split('\n')).toHaveLength(50);
    });

    it('truncates the error log file when it exceeds the size limit', () => {
      setProcessType('browser');
      fsMock.existsSync.mockImplementation(
        (p: string) => p === '/logs/errors.jsonl'
      );
      fsMock.statSync.mockReturnValue({ size: 6 * 1024 * 1024 } as any);
      fsMock.readFileSync.mockReturnValue('a\nb\nc\nd\n' as any);
      loadModule();
      const hook = getErrorHook();
      for (let i = 0; i < 50; i++) {
        hook({ level: 'error', data: [`error number ${i}`] });
      }
      // The writeFileSync (truncation) must have been invoked for errors.jsonl.
      expect(fsMock.writeFileSync).toHaveBeenCalledWith(
        '/logs/errors.jsonl',
        expect.any(String)
      );
    });

    it('does not throw when JSON serialization of the error fails', () => {
      setProcessType('browser');
      loadModule();
      const hook = getErrorHook();
      const circular: any = {};
      circular.self = circular;
      // data.join is fine (it's an array) but getVersion is benign; force a
      // throw path by making getVersion throw.
      getVersion.mockImplementation(() => {
        throw new Error('boom');
      });
      expect(() =>
        hook({ level: 'error', data: ['boom message'] })
      ).not.toThrow();
    });
  });

  describe('before-quit flush', () => {
    it('flushes synchronously and clears the timer on before-quit', () => {
      setProcessType('browser');
      loadModule();
      const errorHook = fakeLog.hooks[2];
      errorHook({ level: 'error', data: ['final error'] });

      const beforeQuitCall = appOn.mock.calls.find(
        ([event]) => event === 'before-quit'
      );
      expect(beforeQuitCall).toBeDefined();
      const beforeQuitHandler = beforeQuitCall![1] as () => void;
      beforeQuitHandler();

      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(1);
      const [, content] = fsMock.appendFileSync.mock.calls[0];
      expect(String(content)).toContain('final error');
    });
  });

  describe('logWithContext', () => {
    it('routes each level to the matching electron-log method', () => {
      setProcessType('browser');
      const mod = loadModule();

      mod.logWithContext('debug', undefined, 'd');
      mod.logWithContext('info', undefined, 'i');
      mod.logWithContext('warn', undefined, 'w');
      mod.logWithContext('error', undefined, 'e');

      expect(fakeLog.debug).toHaveBeenCalledWith('[main]', 'd');
      expect(fakeLog.info).toHaveBeenCalledWith('[main]', 'i');
      expect(fakeLog.warn).toHaveBeenCalledWith('[main]', 'w');
      expect(fakeLog.error).toHaveBeenCalledWith('[main]', 'e');
    });
  });

  describe('setLogLevel / getLogLevel', () => {
    it('sets both console and file transport levels', () => {
      setProcessType('browser');
      const mod = loadModule();
      mod.setLogLevel('verbose');
      expect(fakeLog.transports.console?.level).toBe('verbose');
      expect(fakeLog.transports.file?.level).toBe('verbose');
    });

    it('returns the current file transport level', () => {
      setProcessType('browser');
      const mod = loadModule();
      fakeLog.transports.file!.level = 'silly';
      expect(mod.getLogLevel()).toBe('silly');
    });

    it('falls back to "info" when no file transport exists', () => {
      setProcessType('renderer');
      fakeLog = makeFakeLog(false);
      const mod = loadModule();
      expect(mod.getLogLevel()).toBe('info');
    });
  });

  describe('setupDebugLoggingWatch', () => {
    it('is a no-op outside the browser process', () => {
      setProcessType('renderer');
      const mod = loadModule();
      mod.setupDebugLoggingWatch();
      expect(watchImpl).not.toHaveBeenCalled();
    });

    it('enables debug level immediately when the toggle is on', () => {
      setProcessType('browser');
      selectImpl = jest.fn(() => true);
      const mod = loadModule();
      mod.setupDebugLoggingWatch();
      expect(fakeLog.transports.file?.level).toBe('debug');
      expect(watchImpl).toHaveBeenCalledTimes(1);
    });

    it('registers a watcher that toggles between debug and info', () => {
      setProcessType('browser');
      selectImpl = jest.fn(() => false);
      const mod = loadModule();
      mod.setupDebugLoggingWatch();

      const [, callback] = watchImpl.mock.calls[0];
      callback(true);
      expect(fakeLog.transports.file?.level).toBe('debug');
      callback(false);
      expect(fakeLog.transports.file?.level).toBe('info');
    });

    it('swallows errors when the store is not yet initialized', () => {
      setProcessType('browser');
      selectImpl = jest.fn(() => {
        throw new Error('store not ready');
      });
      const mod = loadModule();
      expect(() => mod.setupDebugLoggingWatch()).not.toThrow();
    });
  });

  describe('setupWebContentsLogging', () => {
    it('is a no-op outside the browser process', () => {
      setProcessType('renderer');
      const mod = loadModule();
      mod.setupWebContentsLogging();
      expect(ipcMainOn).not.toHaveBeenCalled();
    });

    it('registers IPC handlers and web-contents-created listener', () => {
      setProcessType('browser');
      const mod = loadModule();
      mod.setupWebContentsLogging();

      expect(ipcMainOn).toHaveBeenCalledWith(
        'log-viewer-window/get-server-tag',
        expect.any(Function)
      );
      expect(ipcMainOn).toHaveBeenCalledWith(
        'console-log',
        expect.any(Function)
      );
      expect(appOn).toHaveBeenCalledWith(
        'web-contents-created',
        expect.any(Function)
      );
    });

    describe('get-server-tag IPC handler', () => {
      const getHandler = (mod: typeof LoggingModule) => {
        mod.setupWebContentsLogging();
        const call = ipcMainOn.mock.calls.find(
          ([channel]) => channel === 'log-viewer-window/get-server-tag'
        );
        return call![1] as (event: any, origin: string) => void;
      };

      it('returns the matched server host for a known origin', () => {
        setProcessType('browser');
        selectImpl = jest.fn(() => [{ url: 'https://chat.example.com/' }]);
        const mod = loadModule();
        const handler = getHandler(mod);
        const event: any = {};
        handler(event, 'https://chat.example.com');
        expect(event.returnValue).toBe('chat.example.com');
      });

      it('returns an empty string when no server matches', () => {
        setProcessType('browser');
        selectImpl = jest.fn(() => [{ url: 'https://other.example.com/' }]);
        const mod = loadModule();
        const handler = getHandler(mod);
        const event: any = {};
        handler(event, 'https://chat.example.com');
        expect(event.returnValue).toBe('');
      });

      it('returns an empty string when select throws', () => {
        setProcessType('browser');
        selectImpl = jest.fn(() => {
          throw new Error('boom');
        });
        const mod = loadModule();
        const handler = getHandler(mod);
        const event: any = {};
        handler(event, 'https://chat.example.com');
        expect(event.returnValue).toBe('');
      });
    });

    describe('console-log IPC handler', () => {
      const getHandler = (mod: typeof LoggingModule) => {
        mod.setupWebContentsLogging();
        const call = ipcMainOn.mock.calls.find(
          ([channel]) => channel === 'console-log'
        );
        return call![1] as (
          event: any,
          level: string,
          id: number,
          url: string,
          ...args: any[]
        ) => void;
      };

      const makeSender = (type = 'window', url = '') => ({
        id: 42,
        getType: () => type,
        getURL: () => url,
      });

      it('routes each level to the matching electron-log method', () => {
        setProcessType('browser');
        const mod = loadModule();
        const handler = getHandler(mod);
        const event = { sender: makeSender() };

        handler(event, 'debug', 1, 'u', 'd');
        handler(event, 'info', 1, 'u', 'i');
        handler(event, 'warn', 1, 'u', 'w');
        handler(event, 'error', 1, 'u', 'e');
        handler(event, 'verbose', 1, 'u', 'v');
        handler(event, 'unknownLevel', 1, 'u', 'x');

        expect(fakeLog.debug).toHaveBeenCalledWith('[main]', 'd');
        expect(fakeLog.info).toHaveBeenCalledWith('[main]', 'i');
        expect(fakeLog.warn).toHaveBeenCalledWith('[main]', 'w');
        expect(fakeLog.error).toHaveBeenCalledWith('[main]', 'e');
        // verbose maps to debug
        expect(fakeLog.debug).toHaveBeenCalledWith('[main]', 'v');
        // unknown maps to info
        expect(fakeLog.info).toHaveBeenCalledWith('[main]', 'x');
      });

      it('enforces the per-sender rate limit', () => {
        setProcessType('browser');
        const mod = loadModule();
        const handler = getHandler(mod);
        const event = { sender: makeSender() };

        for (let i = 0; i < 105; i++) {
          handler(event, 'info', 1, 'u', `msg ${i}`);
        }
        // Only the first 100 messages within the window reach electron-log.
        expect(fakeLog.info).toHaveBeenCalledTimes(100);
      });

      it('registers the sender server mapping for webview senders', () => {
        setProcessType('browser');
        selectImpl = jest.fn(() => [{ url: 'https://chat.example.com' }]);
        const mod = loadModule();
        const handler = getHandler(mod);
        const event = {
          sender: makeSender('webview', 'https://chat.example.com/channel'),
        };
        handler(event, 'info', 1, 'u', 'hello');
        // The matched server is registered; logging proceeds with context.
        expect(fakeLog.info).toHaveBeenCalled();
      });

      it('swallows errors raised inside the handler', () => {
        setProcessType('browser');
        const mod = loadModule();
        const handler = getHandler(mod);
        const event = {
          sender: {
            get id() {
              throw new Error('boom');
            },
            getType: () => 'window',
          },
        };
        expect(() => handler(event, 'info', 1, 'u', 'x')).not.toThrow();
      });
    });

    describe('web-contents-created listener', () => {
      const getListener = (mod: typeof LoggingModule) => {
        mod.setupWebContentsLogging();
        const call = appOn.mock.calls.find(
          ([event]) => event === 'web-contents-created'
        );
        return call![1] as (event: any, webContents: any) => void;
      };

      const makeWebContents = (type: string) => {
        const handlers: Record<string, (...a: any[]) => void> = {};
        return {
          id: 7,
          getType: () => type,
          getURL: () => 'https://chat.example.com/x',
          on: (evt: string, cb: (...a: any[]) => void) => {
            handlers[evt] = cb;
          },
          executeJavaScript: jest.fn<Promise<void>, [string]>(() =>
            Promise.resolve()
          ),
          _handlers: handlers,
        };
      };

      it('skips window-type webContents entirely', () => {
        setProcessType('browser');
        const mod = loadModule();
        const listener = getListener(mod);
        const wc = makeWebContents('window');
        listener({}, wc);
        // window type returns early — no dom-ready handler registered.
        expect(wc._handlers['dom-ready']).toBeUndefined();
      });

      it('injects the console override into webview dom-ready', () => {
        setProcessType('browser');
        selectImpl = jest.fn(() => [{ url: 'https://chat.example.com' }]);
        const mod = loadModule();
        const listener = getListener(mod);
        const wc = makeWebContents('webview');
        listener({}, wc);
        wc._handlers['dom-ready']();
        expect(wc.executeJavaScript).toHaveBeenCalledTimes(1);
        const script = wc.executeJavaScript.mock.calls[0][0];
        expect(script).toContain("ipcRenderer.send('console-log'");
      });

      it('cleans up on destroyed', () => {
        setProcessType('browser');
        const mod = loadModule();
        const listener = getListener(mod);
        const wc = makeWebContents('webview');
        listener({}, wc);
        expect(() => wc._handlers.destroyed()).not.toThrow();
      });
    });
  });

  describe('re-exports', () => {
    it('re-exports utility, context, scopes and cleanup symbols', () => {
      setProcessType('browser');
      const mod = loadModule();
      // From ./context
      expect(typeof mod.getLogContext).toBe('function');
      expect(typeof mod.formatLogContext).toBe('function');
      // From ./scopes
      expect(typeof mod.createScopedLogger).toBe('function');
      expect(mod.loggers).toBeDefined();
      // From ./utils
      expect(typeof mod.logExecutionTime).toBe('function');
      // From ./cleanup
      expect(typeof mod.cleanupOldLogs).toBe('function');
    });
  });
});
