import { ipcRenderer, IpcRendererEvent } from 'electron';

import { Handler, Channel } from './channels';

export const handle = <N extends Channel>(
  channel: N,
  handler: (...args: Parameters<Handler<N>>) => Promise<ReturnType<Handler<N>>>
): (() => void) => {
  const listener = async (
    _: IpcRendererEvent,
    id: string,
    ...args: any[]
  ): Promise<void> => {
    try {
      const resolved = await handler(...(args as Parameters<Handler<N>>));

      ipcRenderer.send(`${channel}@${id}`, { resolved });
    } catch (error) {
      error instanceof Error &&
        ipcRenderer.send(`${channel}@${id}`, {
          rejected: {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack,
          },
        });
    }
  };

  ipcRenderer.on(channel, listener);

  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
};

export const invoke = <N extends Channel>(
  channel: N,
  ...args: Parameters<Handler<N>>
): Promise<ReturnType<Handler<N>>> => ipcRenderer.invoke(channel, ...args);
