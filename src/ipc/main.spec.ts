jest.mock('electron', () => ({
  ipcMain: {
    once: jest.fn(),
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
}));

import { invoke, handle } from './main';
import { ipcMain } from 'electron';

describe('ipc main', () => {
  const webContents = {
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    webContents.send.mockClear();
  });

  it('resolves invoke calls on resolved payload', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.12);

    (ipcMain.once as jest.Mock).mockImplementation((_: string, cb: any) => {
      cb({}, { resolved: 'ok', rejected: undefined });
    });

    const promise = invoke(webContents, 'channels/ping' as any, 'a', 'b');

    const sentArgs = webContents.send.mock.calls[0];
    expect(sentArgs[0]).toContain('channels/ping');

    if (sentArgs.length === 4) {
      expect(sentArgs[1]).toMatch(/^[0-9a-f]+$/);
      expect(sentArgs[2]).toBe('a');
      expect(sentArgs[3]).toBe('b');
    } else if (sentArgs.length === 3) {
      expect(sentArgs[1]).toBe('a');
      expect(sentArgs[2]).toBe('b');
    } else {
      throw new Error('Unexpected send args');
    }
    await expect(promise).resolves.toBe('ok');

    randomSpy.mockRestore();
  });

  it('rejects invoke calls on rejected payload', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.34);

    (ipcMain.once as jest.Mock).mockImplementation((_: string, cb: any) => {
      cb({}, { rejected: { message: 'bad', name: 'Error', stack: 'stack' } });
    });

    await expect(invoke(webContents, 'channels/ping' as any)).rejects.toThrow(
      'bad'
    );

    randomSpy.mockRestore();
  });

  it('registers and removes ipc handlers', () => {
    const handler = jest.fn(async () => 'ok');
    const remove = handle('channels/ping' as any, handler as any);
    const event = { sender: webContents };

    expect(ipcMain.handle).toHaveBeenCalledWith(
      'channels/ping',
      expect.any(Function)
    );

    const registered = (ipcMain.handle as jest.Mock).mock.calls[0][1];
    expect(registered(event, 'a', 'b')).resolves.toBe('ok');

    remove();
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('channels/ping');
  });
});
