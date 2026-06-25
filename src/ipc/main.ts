import type { WebContents } from 'electron';
import { ipcMain } from 'electron';

import type { Handler, Channel } from './channels';

export const invoke = <N extends Channel>(
  webContents: WebContents,
  channel: N,
  ...args: Parameters<Handler<N>>
): Promise<ReturnType<Handler<N>>> =>
  new Promise<ReturnType<Handler<N>>>((resolve, reject) => {
    if (webContents.isDestroyed()) {
      reject(new Error('WebContents is already destroyed.'));
      return;
    }

    const id = Math.random().toString(16).slice(2);
    const responseChannel = `${channel}@${id}`;

    const cleanup = () => {
      ipcMain.removeListener(responseChannel, listener);
      webContents.removeListener('destroyed', onDestroyed);
    };

    const listener = (
      _: any,
      { resolved, rejected }: { resolved?: any; rejected?: any }
    ) => {
      cleanup();
      if (rejected) {
        const error = new Error(rejected.message);
        error.name = rejected.name;
        error.stack = rejected.stack;
        reject(error);
        return;
      }

      resolve(resolved);
    };

    const onDestroyed = () => {
      cleanup();
      reject(
        new Error(
          `WebContents was destroyed while waiting for IPC response on ${channel}`
        )
      );
    };

    ipcMain.on(responseChannel, listener);
    webContents.once('destroyed', onDestroyed);

    try {
      webContents.send(channel, id, ...args);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });

export const handle = <N extends Channel>(
  channel: N,
  handler: (
    webContents: WebContents,
    ...args: Parameters<Handler<N>>
  ) => Promise<ReturnType<Handler<N>>>
): (() => void) => {
  ipcMain.handle(channel, (event, ...args: any[]) =>
    handler(event.sender, ...(args as Parameters<Handler<N>>))
  );

  return () => {
    ipcMain.removeHandler(channel);
  };
};
