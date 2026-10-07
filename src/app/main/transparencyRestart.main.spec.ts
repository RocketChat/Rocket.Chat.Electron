import { app } from 'electron';

import { createMainReduxStore, dispatch, select } from '../../store';
import { SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED } from '../../ui/actions';
import { askForTransparencyRestart } from '../../ui/main/dialogs';
import { setupApp } from './app';
import { flushPersistedValues, persistValues } from './persistence';

jest.mock('electron', () => ({
  app: {
    setAboutPanelOptions: jest.fn(),
    addListener: jest.fn(),
    whenReady: jest.fn(() => new Promise(() => undefined)),
    getVersion: jest.fn(() => 'test'),
    getAppPath: jest.fn(() => '/test'),
    relaunch: jest.fn(),
    exit: jest.fn(),
    isPackaged: false,
  },
}));

jest.mock('../../store/ipc', () => ({
  forwardToRenderers: () => (next: (action: unknown) => unknown) => next,
}));
jest.mock('../../store/readSetting', () => ({ readSetting: jest.fn() }));
jest.mock('../../ui/main/rootWindow', () => ({ getRootWindow: jest.fn() }));
jest.mock('../../utils/browserLauncher', () => ({
  preloadBrowsersList: jest.fn(),
}));
jest.mock('../../ui/main/dialogs', () => ({
  askForTransparencyRestart: jest.fn(),
}));
jest.mock('./persistence', () => ({
  persistValues: jest.fn(),
  flushPersistedValues: jest.fn(),
}));

const originalPlatform = process.platform;
const askForRestart = jest.mocked(askForTransparencyRestart);
const setTransparency = (payload: boolean): void => {
  dispatch({
    type: SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED,
    payload,
  });
};
const transparency = (): boolean =>
  select(({ isTransparentWindowEnabled }) => isTransparentWindowEnabled);
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('transparency restart confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });
    createMainReduxStore();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('waits for confirmation, then persists and flushes before exiting', async () => {
    let confirm!: (value: boolean) => void;
    askForRestart.mockReturnValue(
      new Promise((resolve) => {
        confirm = resolve;
      })
    );
    setupApp();
    setTransparency(true);
    expect(app.exit).not.toHaveBeenCalled();
    expect(persistValues).not.toHaveBeenCalled();
    confirm(true);
    await settle();
    expect(persistValues).toHaveBeenCalledWith(
      expect.objectContaining({ isTransparentWindowEnabled: true })
    );
    expect(flushPersistedValues).toHaveBeenCalledTimes(1);
    expect(app.relaunch).toHaveBeenCalledTimes(1);
    expect(app.exit).toHaveBeenCalledTimes(1);
    expect(jest.mocked(persistValues).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(flushPersistedValues).mock.invocationCallOrder[0]
    );
    expect(
      jest.mocked(flushPersistedValues).mock.invocationCallOrder[0]
    ).toBeLessThan(jest.mocked(app.exit).mock.invocationCallOrder[0]);
  });

  it.each([false, true])(
    'Cancel restores the original %s preference without another prompt',
    async (original) => {
      setTransparency(original);
      setupApp();
      askForRestart.mockResolvedValue(false);
      setTransparency(!original);
      await settle();
      expect(transparency()).toBe(original);
      expect(askForRestart).toHaveBeenCalledTimes(1);
      expect(persistValues).toHaveBeenCalledWith(
        expect.objectContaining({ isTransparentWindowEnabled: original })
      );
      expect(flushPersistedValues).toHaveBeenCalledTimes(1);
      expect(app.exit).not.toHaveBeenCalled();
    }
  );

  it('does not prompt for an unchanged preference', () => {
    setupApp();
    setTransparency(false);
    expect(askForRestart).not.toHaveBeenCalled();
    expect(app.exit).not.toHaveBeenCalled();
  });

  it('avoids duplicate dialogs and a restart if the preference is restored while waiting', async () => {
    let confirm!: (value: boolean) => void;
    askForRestart.mockReturnValue(
      new Promise((resolve) => {
        confirm = resolve;
      })
    );
    setupApp();
    setTransparency(true);
    setTransparency(true);
    setTransparency(false);
    confirm(true);
    await settle();
    expect(askForRestart).toHaveBeenCalledTimes(1);
    expect(app.exit).not.toHaveBeenCalled();
  });

  it('restores the preference when the dialog fails and permits another attempt', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      setupApp();
      askForRestart.mockRejectedValueOnce(new Error('dialog unavailable'));
      setTransparency(true);
      await settle();
      expect(transparency()).toBe(false);
      expect(app.exit).not.toHaveBeenCalled();
      askForRestart.mockResolvedValue(false);
      setTransparency(true);
      await settle();
      expect(askForRestart).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });

  it.each(['linux', 'win32'])(
    'does not restart for a setting without native transparency on %s',
    async (platform) => {
      Object.defineProperty(process, 'platform', {
        value: platform,
        configurable: true,
      });
      setupApp();
      setTransparency(true);
      await settle();
      expect(askForRestart).not.toHaveBeenCalled();
      expect(app.exit).not.toHaveBeenCalled();
    }
  );
});
