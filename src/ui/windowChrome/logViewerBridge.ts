/**
 * Bridge types for sandboxed secondary windows.
 *
 * This module must not import `electron`. It is bundled into the sandboxed
 * Log Viewer renderer, where `require('electron')` is unavailable.
 */

/** Subscribe to a channel, returning an unsubscribe function. */
export type BridgeSubscribe = (
  channel: string,
  listener: (value: boolean) => void
) => () => void;

/** Invoke a whitelisted channel in the main process. */
export type BridgeInvoke = (
  channel: string,
  ...args: unknown[]
) => Promise<unknown>;

type LogViewerBridge = {
  invoke: BridgeInvoke;
  on: (
    eventChannel: string,
    listener: (...args: unknown[]) => void
  ) => () => void;
};

type BridgeWindow = {
  RocketChatDesktop?: {
    logViewer?: LogViewerBridge;
  };
};

/**
 * Returns the sandboxed `RocketChatDesktop.logViewer` bridge when present.
 *
 * @returns The bridge, or `undefined` outside the sandboxed window.
 */
export const getLogViewerBridge = ():
  | LogViewerBridge
  | undefined =>
  (window as unknown as BridgeWindow).RocketChatDesktop?.logViewer;
