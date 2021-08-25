import { ipcMain, WebContents } from 'electron';

import { Handler, Channel } from './channels';

export const invoke = <N extends Channel>(
  webContents: WebContents,
  channel: N,
  ...args: Parameters<Handler<N>>
): Promise<ReturnType<Handler<N>>> =>
  new Promise<ReturnType<Handler<N>>>((resolve, reject) => {
    const id = Math.random().toString(16).slice(2);

    ipcMain.once(`${channel}@${id}`, (_, { resolved, rejected }) => {
      if (rejected) {
        const error = new Error(rejected.message);
        error.name = rejected.name;
        error.stack = rejected.stack;
        reject(error);
        return;
      }

      resolve(resolved);
    });

    webContents.send(channel, id, ...args);
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
