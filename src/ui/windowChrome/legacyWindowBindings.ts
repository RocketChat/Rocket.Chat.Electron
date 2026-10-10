import { ipcRenderer } from 'electron';

import { invoke } from '../../ipc/renderer';
import type { BridgeInvoke, BridgeSubscribe } from './logViewerBridge';

/**
 * Legacy transparency subscription for windows with `nodeIntegration: true`.
 *
 * Must not be imported by the sandboxed Log Viewer bundle.
 *
 * @param channel The channel to listen on.
 * @param listener Called with the pushed boolean value.
 * @returns Unsubscribe function.
 */
export const legacyTransparencySubscribe: BridgeSubscribe = (
  channel,
  listener
) => {
  const handleChange = (_event: unknown, enabled: boolean): void => {
    listener(Boolean(enabled));
  };
  ipcRenderer.on(channel, handleChange);
  return () => {
    ipcRenderer.off(channel, handleChange);
  };
};

/**
 * Legacy invoke for windows with `nodeIntegration: true`.
 *
 * @param channel The channel to invoke.
 * @param args Arguments forwarded to the main process.
 * @returns Promise of the handler result.
 */
export const legacyInvoke: BridgeInvoke = (channel, ...args) =>
  (invoke as (...invokeArgs: unknown[]) => Promise<unknown>)(channel, ...args);

/**
 * Legacy maximized-state subscription for windows with `nodeIntegration: true`.
 *
 * @param channel The maximized channel.
 * @param listener Called with the pushed boolean value.
 * @returns Unsubscribe function.
 */
export const legacyMaximizedSubscribe: BridgeSubscribe = (
  channel,
  listener
) => {
  const handleChange = (_event: unknown, maximized: boolean): void => {
    listener(Boolean(maximized));
  };
  ipcRenderer.on(channel, handleChange);
  return () => {
    ipcRenderer.off(channel, handleChange);
  };
};
