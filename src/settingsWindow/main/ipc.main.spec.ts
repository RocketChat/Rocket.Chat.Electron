/**
 * Confirm path for removing a stored certificate decision. Lives in main/ so
 * jest's main-process project discovers it.
 */
export {};

const handleRegistry = new Map<string, (...args: any[]) => any>();

jest.mock('../../ipc/main', () => ({
  handle: jest.fn((channel: string, cb: (...args: any[]) => any) => {
    handleRegistry.set(channel, cb);
    return () => handleRegistry.delete(channel);
  }),
}));

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
  listen: jest.fn(),
  select: jest.fn(() => false),
  watch: jest.fn(),
}));

jest.mock('../../app/main/app', () => ({
  packageJsonInformation: { productName: 'Rocket.Chat' },
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(() =>
    Promise.resolve({
      getNormalBounds: () => ({ x: 0, y: 0, width: 1200, height: 800 }),
    })
  ),
}));

jest.mock('../../ui/main/secondaryWindowControls', () => ({
  watchWindowControls: jest.fn(),
}));

jest.mock('../../ui/main/secondaryWindowFocus', () => ({
  focusSecondaryWindow: jest.fn(),
}));

jest.mock('../../ui/main/secondaryWindowState', () => ({
  getSavedWindowBounds: jest.fn(() => undefined),
  watchWindowBounds: jest.fn(),
}));

jest.mock('../../ui/windowChrome/appearance', () => ({
  NOT_FULL_SCREENABLE: {},
  getTitleBarOptions: jest.fn(() => ({})),
}));

jest.mock('i18next', () => ({
  t: (key: string, options?: { domain?: string }) =>
    options?.domain ? `${key}:${options.domain}` : key,
}));

type FakeBW = {
  isDestroyed: jest.Mock;
  webContents: {
    on: jest.Mock;
    setWindowOpenHandler: jest.Mock;
    send: jest.Mock;
  };
  loadFile: jest.Mock;
  once: jest.Mock;
  on: jest.Mock;
  setTitle: jest.Mock;
  show: jest.Mock;
  showInactive: jest.Mock;
};

const createdWindows: FakeBW[] = [];

class FakeBrowserWindow {
  webContents = {
    on: jest.fn(),
    setWindowOpenHandler: jest.fn(),
    send: jest.fn(),
  };

  loadFile = jest.fn(() => Promise.resolve());

  once = jest.fn();

  on = jest.fn();

  setTitle = jest.fn();

  show = jest.fn();

  showInactive = jest.fn();

  isDestroyed = jest.fn(() => false);

  constructor() {
    createdWindows.push(this as unknown as FakeBW);
  }
}

jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn(() => '/app'),
    on: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => new FakeBrowserWindow()),
  dialog: {
    showMessageBox: jest.fn(),
  },
  screen: {
    getDisplayNearestPoint: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    })),
  },
}));

const loadIpc = async () => {
  const ipc = await import('../ipc');
  const { dialog } = jest.requireMock('electron') as {
    dialog: { showMessageBox: jest.Mock };
  };
  return { ...ipc, showMessageBox: dialog.showMessageBox };
};

const confirmHandler = () => {
  const handler = handleRegistry.get(
    'settings-window/confirm-remove-certificate'
  );
  if (!handler) {
    throw new Error('confirm-remove-certificate was not registered');
  }
  return handler;
};

describe('settings-window/confirm-remove-certificate', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    handleRegistry.clear();
    createdWindows.length = 0;
  });

  it('returns false and does not show a dialog when the window is gone', async () => {
    const { startSettingsWindowHandler, showMessageBox } = await loadIpc();
    startSettingsWindowHandler();

    await expect(confirmHandler()({} as never, 'example.test')).resolves.toBe(
      false
    );
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('returns false on cancel so the certificate is not removed', async () => {
    const { openSettingsWindow, startSettingsWindowHandler, showMessageBox } =
      await loadIpc();
    startSettingsWindowHandler();
    await openSettingsWindow();

    showMessageBox.mockResolvedValue({ response: 1 });

    await expect(confirmHandler()({} as never, 'example.test')).resolves.toBe(
      false
    );
    expect(showMessageBox).toHaveBeenCalledWith(
      createdWindows[0],
      expect.objectContaining({
        type: 'warning',
        defaultId: 1,
        cancelId: 1,
        title: 'dialog.removeCertificate.title',
        message: 'dialog.removeCertificate.message:example.test',
      })
    );
  });

  it('returns true on accept so the certificate can be removed', async () => {
    const { openSettingsWindow, startSettingsWindowHandler, showMessageBox } =
      await loadIpc();
    startSettingsWindowHandler();
    await openSettingsWindow();

    showMessageBox.mockResolvedValue({ response: 0 });

    await expect(confirmHandler()({} as never, 'example.test')).resolves.toBe(
      true
    );
  });
});
