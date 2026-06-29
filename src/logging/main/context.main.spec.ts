import {
  cleanupServerContext,
  formatLogContext,
  getComponentContext,
  getHost,
  getLogContext,
  getProcessContext,
  getServerContext,
  registerWebContentsServer,
  type ILogContext,
} from '../context';

type StubWebContents = {
  id: number;
  getType: () => string;
};

const makeWebContents = (id: number, type = 'window'): StubWebContents => ({
  id,
  getType: () => type,
});

describe('logging/context', () => {
  describe('getProcessContext', () => {
    const originalType = process.type;

    afterEach(() => {
      Object.defineProperty(process, 'type', {
        value: originalType,
        configurable: true,
      });
      // Clean up any window stub left on globalThis.
      delete (globalThis as any).window;
    });

    const setProcessType = (value: string | undefined) => {
      Object.defineProperty(process, 'type', {
        value,
        configurable: true,
      });
    };

    it('returns "main" when running in the browser process', () => {
      setProcessType('browser');
      expect(getProcessContext()).toBe('main');
    });

    it('returns "preload" for any non browser/renderer process type', () => {
      setProcessType('worker');
      expect(getProcessContext()).toBe('preload');
    });

    it('returns "renderer:unknown" for renderer without a window', () => {
      setProcessType('renderer');
      delete (globalThis as any).window;
      expect(getProcessContext()).toBe('renderer:unknown');
    });

    it('returns "renderer:root" when the window points at /index.html', () => {
      setProcessType('renderer');
      (globalThis as any).window = {
        location: { pathname: '/index.html' },
      };
      expect(getProcessContext()).toBe('renderer:root');
    });

    it('returns "renderer:root" when the window points at /', () => {
      setProcessType('renderer');
      (globalThis as any).window = { location: { pathname: '/' } };
      expect(getProcessContext()).toBe('renderer:root');
    });

    it('returns "renderer:videocall" for the video call window path', () => {
      setProcessType('renderer');
      (globalThis as any).window = {
        location: { pathname: '/video-call-window.html' },
      };
      expect(getProcessContext()).toBe('renderer:videocall');
    });

    it('returns "renderer:webview" for any other renderer path', () => {
      setProcessType('renderer');
      (globalThis as any).window = {
        location: { pathname: '/some-other.html' },
      };
      expect(getProcessContext()).toBe('renderer:webview');
    });

    it('falls back to "renderer:webview" when window has no location', () => {
      setProcessType('renderer');
      (globalThis as any).window = {};
      expect(getProcessContext()).toBe('renderer:webview');
    });
  });

  describe('getHost', () => {
    it('extracts the host from a valid URL', () => {
      expect(getHost('https://chat.example.com/path')).toBe('chat.example.com');
    });

    it('includes the port when it is non-default', () => {
      expect(getHost('http://localhost:3000/foo')).toBe('localhost:3000');
    });

    it('returns the original string when the URL is invalid', () => {
      expect(getHost('not a url')).toBe('not a url');
    });
  });

  describe('registerWebContentsServer / getServerContext', () => {
    afterEach(() => {
      // Reset registry state between tests.
      cleanupServerContext(1);
      cleanupServerContext(2);
      cleanupServerContext(3);
    });

    it('returns "local" when no webContents is provided', () => {
      expect(getServerContext(undefined)).toBe('local');
    });

    it('returns the registered host for a known webContents', () => {
      registerWebContentsServer(1, 'https://chat.example.com/foo');
      expect(getServerContext(makeWebContents(1) as any)).toBe(
        'chat.example.com'
      );
    });

    it('returns "local" for an unregistered window type webContents', () => {
      expect(getServerContext(makeWebContents(2, 'window') as any)).toBe(
        'local'
      );
    });

    it('returns "unknown" for an unregistered non-window webContents', () => {
      expect(getServerContext(makeWebContents(3, 'webview') as any)).toBe(
        'unknown'
      );
    });

    it('cleanupServerContext removes a registered association', () => {
      registerWebContentsServer(1, 'https://chat.example.com');
      expect(getServerContext(makeWebContents(1, 'webview') as any)).toBe(
        'chat.example.com'
      );

      cleanupServerContext(1);

      expect(getServerContext(makeWebContents(1, 'webview') as any)).toBe(
        'unknown'
      );
    });
  });

  describe('getComponentContext', () => {
    it('returns "general" when stack capture is disabled', () => {
      expect(getComponentContext(false)).toBe('general');
    });

    it('returns "general" by default (no argument)', () => {
      expect(getComponentContext()).toBe('general');
    });

    const classify = (stack: string): string => {
      const spy = jest
        .spyOn(global, 'Error')
        .mockImplementation(() => ({ stack }) as any);
      try {
        return getComponentContext(true);
      } finally {
        spy.mockRestore();
      }
    };

    it.each([
      ['login flow stack', 'at Login.handle (login.ts:1)', 'auth'],
      ['connection stack', 'at websocket.connect (network.ts:1)', 'connection'],
      ['notification stack', 'at Notification.show (n.ts:1)', 'notifications'],
      ['update stack', 'at Update.apply (u.ts:1)', 'updates'],
      ['outlook stack', 'at getOutlookEvents (o.ts:1)', 'outlook'],
      ['server stack', 'at Server.add (servers.ts:1)', 'servers'],
      ['video stack', 'at jitsi.join (video.ts:1)', 'videocall'],
      ['preload stack', 'at preload.run (x.ts:1)', 'preload'],
      ['ipc stack', 'at IPC.dispatch (x.ts:1)', 'ipc'],
      ['storage stack', 'at store.set (storage.ts:1)', 'storage'],
      ['ui stack', 'at component.render (ui.ts:1)', 'ui'],
      ['app stack', 'at main.boot (app.ts:1)', 'app'],
    ])('classifies %s as %s', (_label, stack, expected) => {
      expect(classify(stack)).toBe(expected);
    });

    it('returns "general" for an unrecognized stack', () => {
      expect(classify('at xyz.qux (zzz.ts:1)')).toBe('general');
    });

    it('handles a missing stack string gracefully', () => {
      const spy = jest
        .spyOn(global, 'Error')
        .mockImplementation(() => ({ stack: undefined }) as any);
      try {
        expect(getComponentContext(true)).toBe('general');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('getLogContext', () => {
    const originalType = process.type;

    beforeEach(() => {
      Object.defineProperty(process, 'type', {
        value: 'browser',
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(process, 'type', {
        value: originalType,
        configurable: true,
      });
      cleanupServerContext(7);
    });

    it('builds a minimal context without webContents', () => {
      const context = getLogContext();
      expect(context).toEqual({
        processType: 'main',
        component: 'general',
      });
    });

    it('includes webContents and server info when provided', () => {
      registerWebContentsServer(7, 'https://chat.example.com');
      const context = getLogContext(makeWebContents(7, 'webview') as any);

      expect(context.processType).toBe('main');
      expect(context.webContentsType).toBe('webview');
      expect(context.webContentsId).toBe(7);
      expect(context.serverInfo).toEqual({
        url: 'chat.example.com',
        name: 'chat.example.com',
      });
      expect(context.component).toBe('general');
    });

    it('passes the captureComponentStack flag through', () => {
      const spy = jest
        .spyOn(global, 'Error')
        .mockImplementation(() => ({ stack: 'at Login (login.ts)' }) as any);
      try {
        const context = getLogContext(undefined, true);
        expect(context.component).toBe('auth');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('formatLogContext', () => {
    it('formats with only the process type', () => {
      const context: ILogContext = { processType: 'main' };
      expect(formatLogContext(context)).toBe('[main]');
    });

    it('omits a "local" server name', () => {
      const context: ILogContext = {
        processType: 'main',
        serverInfo: { url: 'local', name: 'local' },
      };
      expect(formatLogContext(context)).toBe('[main]');
    });

    it('omits a "general" component', () => {
      const context: ILogContext = {
        processType: 'main',
        component: 'general',
      };
      expect(formatLogContext(context)).toBe('[main]');
    });

    it('includes server name and component when meaningful', () => {
      const context: ILogContext = {
        processType: 'renderer:webview',
        serverInfo: { url: 'chat.example.com', name: 'chat.example.com' },
        component: 'auth',
      };
      expect(formatLogContext(context)).toBe(
        '[renderer:webview] [chat.example.com] [auth]'
      );
    });
  });
});
