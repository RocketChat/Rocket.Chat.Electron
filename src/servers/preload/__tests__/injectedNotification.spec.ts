/* eslint-disable @typescript-eslint/no-var-requires -- injected.ts runs on
   import, so each test loads a fresh copy inside jest.isolateModules */

// The web client reads `window.Notification` when AppLayout first renders
// (useNotificationPermission). On a plain-HTTP server the native class does
// not exist, so the desktop class must be in place before the webapp
// modules (window.require) are ready.
describe('injected.ts Notification override', () => {
  const originalRequire = window.require;
  const originalDesktop = window.RocketChatDesktop;
  const originalNotification = window.Notification;
  let createNotification: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.defineProperty(window, 'require', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'Notification', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    createNotification = jest.fn(() => Promise.resolve('id-1'));
    window.RocketChatDesktop = {
      isUiPreviewActive: () => false,
      reloadServer: jest.fn(),
      createNotification,
      destroyNotification: jest.fn(),
    } as unknown as Window['RocketChatDesktop'];
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    window.sessionStorage.clear();
    Object.defineProperty(window, 'require', {
      value: originalRequire,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'Notification', {
      value: originalNotification,
      configurable: true,
      writable: true,
    });
    window.RocketChatDesktop = originalDesktop;
  });

  const loadInjected = () =>
    jest.isolateModules(() => {
      require('../../../injected');
    });

  it('replaces window.Notification before window.require exists', async () => {
    loadInjected();

    expect(window.Notification).toBeDefined();
    expect(window.Notification.permission).toBe('granted');
    await expect(window.Notification.requestPermission()).resolves.toBe(
      'granted'
    );
  });

  it('routes a notification to the desktop app before window.require exists', () => {
    loadInjected();

    // eslint-disable-next-line no-new
    new window.Notification('Hello', { body: 'World' });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Hello', body: 'World' })
    );
  });
});
