import { ipcRenderer } from 'electron';

import { Handler, Channel } from './channels';

export const handle = <N extends Channel>(
  channel: N,
  handler: (...args: Parameters<Handler<N>>) => Promise<ReturnType<Handler<N>>>,
): void => {
  ipcRenderer.on(channel, async (_, id: string, ...args: Parameters<typeof handler>): Promise<void> => {
    try {
      const resolved = await handler(...args);

      ipcRenderer.send(`${ channel }@${ id }`, { resolved });
    } catch (error) {
      ipcRenderer.send(`${ channel }@${ id }`, {
        rejected: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
    }
  });
};

export const invoke = <N extends Channel>(
  channel: N,
  ...args: Parameters<Handler<N>>
): Promise<ReturnType<Handler<N>>> =>
  ipcRenderer.invoke(channel, ...args);
