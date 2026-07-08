import { app, ipcMain } from 'electron';

import { setupSecureKeyboardEntry } from './secureKeyboardEntry';

jest.mock('electron', () => ({
  app: {
    setSecureKeyboardEntryEnabled: jest.fn(),
  },
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
}));

describe('setupSecureKeyboardEntry', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('on darwin', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
    });

    it('registers the secure-keyboard-entry/set IPC handler', () => {
      setupSecureKeyboardEntry();
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'secure-keyboard-entry/set',
        expect.any(Function)
      );
    });

    it('calls app.setSecureKeyboardEntryEnabled(true) when handler invoked with true', async () => {
      setupSecureKeyboardEntry();
      const handler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      await handler({ sender: {} }, true);
      expect(app.setSecureKeyboardEntryEnabled).toHaveBeenCalledWith(true);
    });

    it('calls app.setSecureKeyboardEntryEnabled(false) when handler invoked with false', async () => {
      setupSecureKeyboardEntry();
      const handler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      await handler({ sender: {} }, false);
      expect(app.setSecureKeyboardEntryEnabled).toHaveBeenCalledWith(false);
    });

    it('returns a cleanup function that removes the IPC handler', () => {
      const remove = setupSecureKeyboardEntry();
      remove();
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(
        'secure-keyboard-entry/set'
      );
    });
  });

  describe('on linux', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
    });

    it('does not register any IPC handler', () => {
      setupSecureKeyboardEntry();
      expect(ipcMain.handle).not.toHaveBeenCalled();
    });

    it('does not call app.setSecureKeyboardEntryEnabled', () => {
      setupSecureKeyboardEntry();
      expect(app.setSecureKeyboardEntryEnabled).not.toHaveBeenCalled();
    });

    it('returns a no-op cleanup function', () => {
      const remove = setupSecureKeyboardEntry();
      expect(() => remove()).not.toThrow();
      expect(ipcMain.removeHandler).not.toHaveBeenCalled();
    });
  });

  describe('on win32', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    it('does not register any IPC handler', () => {
      setupSecureKeyboardEntry();
      expect(ipcMain.handle).not.toHaveBeenCalled();
    });

    it('does not call app.setSecureKeyboardEntryEnabled', () => {
      setupSecureKeyboardEntry();
      expect(app.setSecureKeyboardEntryEnabled).not.toHaveBeenCalled();
    });
  });
});
