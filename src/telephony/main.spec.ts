import { app, clipboard, globalShortcut, Notification } from 'electron';

import { APP_SETTINGS_LOADED } from '../app/actions';
import { dispatch, watch } from '../store';
import { SIDE_BAR_SETTINGS_BUTTON_CLICKED } from '../ui/actions';
import { getRootWindow } from '../ui/main/rootWindow';
import {
  TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET,
  TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED,
} from './actions';
import type { openTelephonyDialpad } from './dialpad';
import { parseTelephonyLink } from './links';
import {
  createTelephonyLinkFromClipboardText,
  registerTelephonyGlobalShortcut,
  setupTelephonyGlobalShortcut,
  teardownTelephonyGlobalShortcut,
  triggerTelephonyGlobalShortcut,
} from './main';
import {
  defaultTelephonyGlobalShortcutConfig,
  defaultTelephonyGlobalShortcutRegistrationStatus,
  telephonyGlobalShortcutConfig,
  telephonyGlobalShortcutRegistrationStatus,
  telephonyPreferredServer,
} from './reducers';

jest.mock('electron', () => {
  const NotificationMock = jest.fn(() => ({
    addListener: jest.fn(),
    show: jest.fn(),
  }));

  return {
    app: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    clipboard: {
      readText: jest.fn(),
    },
    globalShortcut: {
      isRegistered: jest.fn(() => false),
      register: jest.fn(),
      unregister: jest.fn(),
    },
    Notification: Object.assign(NotificationMock, {
      isSupported: jest.fn(() => true),
    }),
  };
});

jest.mock('./dialpad', () => ({
  openTelephonyDialpad: jest.fn(() => Promise.resolve()),
}));

jest.mock('./links', () => ({
  parseTelephonyLink: jest.fn(),
}));

jest.mock('../logging', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../store', () => ({
  dispatch: jest.fn(),
  watch: jest.fn(),
}));

jest.mock('../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(),
}));

const appMock = app as jest.Mocked<typeof app>;
const clipboardMock = clipboard as jest.Mocked<typeof clipboard>;
const globalShortcutMock = globalShortcut as jest.Mocked<typeof globalShortcut>;
const notificationMock = Notification as jest.Mocked<typeof Notification>;
const getOpenTelephonyDialpadMock = (): jest.MockedFunction<
  typeof openTelephonyDialpad
> => {
  const dialpad = jest.requireMock('./dialpad') as {
    openTelephonyDialpad: jest.MockedFunction<typeof openTelephonyDialpad>;
  };
  return dialpad.openTelephonyDialpad;
};
const parseTelephonyLinkMock = parseTelephonyLink as jest.MockedFunction<
  typeof parseTelephonyLink
>;
const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const watchMock = watch as jest.MockedFunction<typeof watch>;
const getRootWindowMock = getRootWindow as jest.MockedFunction<
  typeof getRootWindow
>;

describe('telephony global shortcut main process pipeline', () => {
  const rootWindow = {
    isVisible: jest.fn(() => false),
    showInactive: jest.fn(),
    focus: jest.fn(),
  };

  beforeEach(() => {
    teardownTelephonyGlobalShortcut();
    jest.clearAllMocks();
    parseTelephonyLinkMock.mockReturnValue(null);
    getRootWindowMock.mockResolvedValue(rootWindow as any);
    globalShortcutMock.isRegistered.mockReturnValue(false);
    globalShortcutMock.register.mockReturnValue(true);
  });

  afterEach(() => {
    teardownTelephonyGlobalShortcut();
  });

  it('registers the configured accelerator and reports success', () => {
    registerTelephonyGlobalShortcut({
      enabled: true,
      accelerator: 'CommandOrControl+Shift+D',
    });

    expect(globalShortcutMock.register).toHaveBeenCalledWith(
      'CommandOrControl+Shift+D',
      expect.any(Function)
    );
    expect(dispatchMock).toHaveBeenLastCalledWith({
      type: TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED,
      payload: {
        registered: true,
        accelerator: 'CommandOrControl+Shift+D',
        error: null,
      },
    });
  });

  it('reads clipboard only when triggered and routes usable clipboard text', async () => {
    registerTelephonyGlobalShortcut({
      enabled: true,
      accelerator: 'CommandOrControl+Shift+D',
    });

    expect(clipboardMock.readText).not.toHaveBeenCalled();

    clipboardMock.readText.mockReturnValue(' +1 (800) 555-0199 ');

    await triggerTelephonyGlobalShortcut();

    expect(rootWindow.showInactive).toHaveBeenCalled();
    expect(rootWindow.focus).toHaveBeenCalled();
    expect(getOpenTelephonyDialpadMock()).toHaveBeenCalledWith({
      phoneNumber: '+1 (800) 555-0199',
      rawUri: '+1 (800) 555-0199',
    });
  });

  it('keeps common pasted phone number formats permissive', () => {
    expect(
      createTelephonyLinkFromClipboardText('Call +1 (800) 555-0199 x123')
    ).toEqual({
      phoneNumber: 'Call +1 (800) 555-0199 x123',
      rawUri: 'Call +1 (800) 555-0199 x123',
    });
  });

  it('opens the telephony path with empty input when clipboard is unusable', async () => {
    clipboardMock.readText.mockReturnValue('not a phone number');

    await triggerTelephonyGlobalShortcut();

    expect(getOpenTelephonyDialpadMock()).toHaveBeenCalledWith({
      phoneNumber: '',
      rawUri: '',
    });
  });

  it('skips parsing and opens empty input for empty clipboard text', () => {
    expect(createTelephonyLinkFromClipboardText('   ')).toEqual({
      phoneNumber: '',
      rawUri: '',
    });
    expect(parseTelephonyLinkMock).not.toHaveBeenCalled();
  });

  it('caps clipboard text before parsing or sending it to the renderer', () => {
    expect(createTelephonyLinkFromClipboardText('1'.repeat(257))).toEqual({
      phoneNumber: '',
      rawUri: '',
    });
    expect(parseTelephonyLinkMock).not.toHaveBeenCalled();
  });

  it('debounces repeated shortcut triggers', async () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_100)
      .mockReturnValueOnce(1_300);
    clipboardMock.readText.mockReturnValue('+1 800 555 0199');

    await triggerTelephonyGlobalShortcut();
    await triggerTelephonyGlobalShortcut();
    await triggerTelephonyGlobalShortcut();

    expect(clipboardMock.readText).toHaveBeenCalledTimes(2);
    expect(getOpenTelephonyDialpadMock()).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it('preserves parsed tel/callto links from clipboard', () => {
    parseTelephonyLinkMock.mockReturnValue({
      phoneNumber: '+491234567890',
      rawUri: 'tel:+491234567890',
    });

    expect(createTelephonyLinkFromClipboardText(' tel:+491234567890 ')).toEqual(
      {
        phoneNumber: '+491234567890',
        rawUri: 'tel:+491234567890',
      }
    );
  });

  it('unregisters old accelerator when disabled or changed', () => {
    registerTelephonyGlobalShortcut({
      enabled: true,
      accelerator: 'CommandOrControl+Shift+D',
    });
    registerTelephonyGlobalShortcut({
      enabled: true,
      accelerator: 'CommandOrControl+Shift+E',
    });

    expect(globalShortcutMock.unregister).toHaveBeenCalledWith(
      'CommandOrControl+Shift+D'
    );

    registerTelephonyGlobalShortcut({ enabled: false, accelerator: null });

    expect(globalShortcutMock.unregister).toHaveBeenCalledWith(
      'CommandOrControl+Shift+E'
    );
  });

  it('ignores malformed persisted config without throwing', () => {
    expect(() => registerTelephonyGlobalShortcut(null)).not.toThrow();

    expect(globalShortcutMock.register).not.toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenLastCalledWith({
      type: TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED,
      payload: {
        registered: false,
        accelerator: null,
        error: null,
      },
    });
  });

  it('handles registration conflicts without throwing and shows feedback', () => {
    globalShortcutMock.register.mockReturnValue(false);

    expect(() =>
      registerTelephonyGlobalShortcut({
        enabled: true,
        accelerator: 'CommandOrControl+Shift+D',
      })
    ).not.toThrow();

    expect(dispatchMock).toHaveBeenLastCalledWith({
      type: TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED,
      payload: {
        registered: false,
        accelerator: 'CommandOrControl+Shift+D',
        error:
          'Telephony shortcut CommandOrControl+Shift+D registration failed',
      },
    });
    expect(notificationMock.isSupported).toHaveBeenCalled();
    expect(notificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('could not be registered'),
      })
    );
    expect(
      (notificationMock as unknown as jest.Mock).mock.results[0].value.show
    ).toHaveBeenCalled();
  });

  it('opens Settings when the registration failure notification is clicked', async () => {
    globalShortcutMock.register.mockReturnValue(false);

    registerTelephonyGlobalShortcut({
      enabled: true,
      accelerator: 'CommandOrControl+Shift+D',
    });

    const notification = (notificationMock as unknown as jest.Mock).mock
      .results[0].value;
    const clickListener = notification.addListener.mock.calls.find(
      ([event]: [string]) => event === 'click'
    )?.[1] as (() => Promise<void>) | undefined;

    await clickListener?.();

    expect(rootWindow.focus).toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith({
      type: SIDE_BAR_SETTINGS_BUTTON_CLICKED,
    });
  });

  it('rejects reserved app accelerators before registering', () => {
    registerTelephonyGlobalShortcut({
      enabled: true,
      accelerator: 'CommandOrControl+C',
    });

    expect(globalShortcutMock.register).not.toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenLastCalledWith({
      type: TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED,
      payload: {
        registered: false,
        accelerator: 'CommandOrControl+C',
        error:
          'Telephony shortcut CommandOrControl+C is reserved by the app or operating system',
      },
    });
  });

  it('reports accelerators already registered by Electron before registering', () => {
    globalShortcutMock.isRegistered.mockReturnValue(true);

    registerTelephonyGlobalShortcut({
      enabled: true,
      accelerator: 'CommandOrControl+Shift+D',
    });

    expect(globalShortcutMock.register).not.toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenLastCalledWith({
      type: TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED,
      payload: {
        registered: false,
        accelerator: 'CommandOrControl+Shift+D',
        error:
          'Telephony shortcut CommandOrControl+Shift+D is already registered',
      },
    });
  });

  it('watches config changes and unregisters on app close teardown', () => {
    const unsubscribe = jest.fn();
    let watcher: Parameters<typeof watchMock>[1] | undefined;

    watchMock.mockImplementation((_selector, callback) => {
      watcher = callback as typeof watcher;
      callback(
        { enabled: true, accelerator: 'CommandOrControl+Shift+D' },
        undefined
      );
      return unsubscribe;
    });

    setupTelephonyGlobalShortcut();

    expect(appMock.addListener).toHaveBeenCalledWith(
      'will-quit',
      teardownTelephonyGlobalShortcut
    );
    expect(globalShortcutMock.register).toHaveBeenCalledWith(
      'CommandOrControl+Shift+D',
      expect.any(Function)
    );

    watcher?.(
      { enabled: true, accelerator: 'CommandOrControl+Shift+E' },
      { enabled: true, accelerator: 'CommandOrControl+Shift+D' }
    );

    expect(globalShortcutMock.unregister).toHaveBeenCalledWith(
      'CommandOrControl+Shift+D'
    );

    teardownTelephonyGlobalShortcut();

    expect(unsubscribe).toHaveBeenCalled();
    expect(appMock.removeListener).toHaveBeenCalledWith(
      'will-quit',
      teardownTelephonyGlobalShortcut
    );
    expect(globalShortcutMock.unregister).toHaveBeenCalledWith(
      'CommandOrControl+Shift+E'
    );
  });

  it('unregisters the current accelerator when Electron emits will-quit', () => {
    let willQuitHandler: (() => void) | undefined;
    appMock.addListener.mockImplementation(((event: string, listener) => {
      if (event === 'will-quit') {
        willQuitHandler = listener as () => void;
      }
      return appMock;
    }) as typeof appMock.addListener);
    watchMock.mockImplementation((_selector, callback) => {
      callback(
        { enabled: true, accelerator: 'CommandOrControl+Shift+D' },
        undefined
      );
      return jest.fn();
    });

    setupTelephonyGlobalShortcut();
    willQuitHandler?.();

    expect(globalShortcutMock.unregister).toHaveBeenCalledWith(
      'CommandOrControl+Shift+D'
    );
  });
});

describe('telephony shortcut reducers', () => {
  it('hydrates preferred server from persisted settings', () => {
    expect(
      telephonyPreferredServer(null, {
        type: APP_SETTINGS_LOADED,
        payload: {
          telephonyPreferredServer: 'https://chat.example.com',
        },
      })
    ).toBe('https://chat.example.com');
  });

  it('keeps shortcut config disabled by default and stores UI-provided config', () => {
    expect(
      telephonyGlobalShortcutConfig(undefined, { type: 'UNKNOWN' } as any)
    ).toEqual(defaultTelephonyGlobalShortcutConfig);

    expect(
      telephonyGlobalShortcutConfig(defaultTelephonyGlobalShortcutConfig, {
        type: TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET,
        payload: { enabled: true, accelerator: 'CommandOrControl+Shift+D' },
      })
    ).toEqual({ enabled: true, accelerator: 'CommandOrControl+Shift+D' });
  });

  it('hydrates shortcut config from persisted settings', () => {
    expect(
      telephonyGlobalShortcutConfig(defaultTelephonyGlobalShortcutConfig, {
        type: APP_SETTINGS_LOADED,
        payload: {
          telephonyGlobalShortcutConfig: {
            enabled: true,
            accelerator: 'CommandOrControl+Shift+D',
          },
        },
      })
    ).toEqual({
      enabled: true,
      accelerator: 'CommandOrControl+Shift+D',
    });
  });

  it('normalizes malformed persisted shortcut config', () => {
    expect(
      telephonyGlobalShortcutConfig(defaultTelephonyGlobalShortcutConfig, {
        type: APP_SETTINGS_LOADED,
        payload: {
          telephonyGlobalShortcutConfig: null as any,
        },
      })
    ).toEqual(defaultTelephonyGlobalShortcutConfig);
  });

  it('rejects non-string and oversized persisted shortcut accelerators', () => {
    expect(
      telephonyGlobalShortcutConfig(defaultTelephonyGlobalShortcutConfig, {
        type: APP_SETTINGS_LOADED,
        payload: {
          telephonyGlobalShortcutConfig: {
            enabled: true,
            accelerator: 123 as any,
          },
        },
      })
    ).toEqual(defaultTelephonyGlobalShortcutConfig);

    expect(
      telephonyGlobalShortcutConfig(defaultTelephonyGlobalShortcutConfig, {
        type: APP_SETTINGS_LOADED,
        payload: {
          telephonyGlobalShortcutConfig: {
            enabled: true,
            accelerator: 'A'.repeat(65),
          },
        },
      })
    ).toEqual(defaultTelephonyGlobalShortcutConfig);
  });

  it('stores registration status for Settings UI feedback', () => {
    expect(
      telephonyGlobalShortcutRegistrationStatus(undefined, {
        type: 'UNKNOWN',
      } as any)
    ).toBe(defaultTelephonyGlobalShortcutRegistrationStatus);

    expect(
      telephonyGlobalShortcutRegistrationStatus(
        defaultTelephonyGlobalShortcutRegistrationStatus,
        {
          type: TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED,
          payload: {
            registered: false,
            accelerator: 'CommandOrControl+Shift+D',
            error: 'conflict',
          },
        }
      )
    ).toEqual({
      registered: false,
      accelerator: 'CommandOrControl+Shift+D',
      error: 'conflict',
    });
  });
});
