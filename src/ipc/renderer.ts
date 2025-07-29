import type { IpcRendererEvent } from 'electron';
import { ipcRenderer } from 'electron';

import type { Handler, Channel } from './channels';

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

export interface IRetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Whether to log retry attempts (default: true) */
  logRetries?: boolean;
  /** Custom retry condition - return true to retry, false to give up */
  shouldRetry?: (error: any, attempt: number) => boolean;
}

export const invokeWithRetry = <N extends Channel>(
  channel: N,
  retryOptions: IRetryOptions = {},
  ...args: Parameters<Handler<N>>
): Promise<ReturnType<Handler<N>>> => {
  const {
    maxAttempts = 3,
    retryDelay = 1000,
    logRetries = true,
    shouldRetry = () => true,
  } = retryOptions;

  const attemptInvoke = async (
    attempt: number
  ): Promise<ReturnType<Handler<N>>> => {
    try {
      const result = await ipcRenderer.invoke(channel, ...args);

      // Check if result indicates failure (for channels that return success flags)
      if (
        result &&
        typeof result === 'object' &&
        'success' in result &&
        result.success === false
      ) {
        throw new Error(`IPC call failed: ${channel} returned success: false`);
      }

      return result;
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;

      if (logRetries) {
        console.log(
          `IPC call failed: ${channel} (attempt ${attempt}/${maxAttempts})`,
          error
        );
      }

      if (isLastAttempt || !shouldRetry(error, attempt)) {
        if (logRetries) {
          console.error(
            `IPC call giving up: ${channel} after ${attempt} attempts`,
            error
          );
        }
        throw error;
      }

      if (logRetries) {
        console.log(
          `IPC call retrying: ${channel} in ${retryDelay}ms... (attempt ${attempt + 1}/${maxAttempts})`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return attemptInvoke(attempt + 1);
    }
  };

  return attemptInvoke(1);
};
