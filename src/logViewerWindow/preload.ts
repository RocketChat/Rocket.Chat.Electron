import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED_INVOKE_CHANNELS = new Set([
  'log-viewer-window/select-log-file',
  'log-viewer-window/read-logs',
  'log-viewer-window/stat-log',
  'log-viewer-window/read-logs-tail',
  'log-viewer-window/reveal-log-file',
  'log-viewer-window/confirm-clear-logs',
  'log-viewer-window/clear-logs',
  'log-viewer-window/save-logs',
  'log-viewer-window/get-server-mapping',
  'secondary-window/is-maximized',
  'secondary-window/minimize',
  'secondary-window/toggle-maximize',
  'secondary-window/close',
]);

const ALLOWED_ON_CHANNELS = new Set([
  'log-viewer-window/transparency-changed',
  'secondary-window/maximized-changed',
]);

/**
 * Clones a bridge argument through JSON to strip prototypes and getters.
 *
 * @param arg The value passed through the bridge.
 * @returns A plain structured clone, preserving `undefined`.
 */
const cloneArg = (arg: unknown): unknown =>
  arg !== undefined ? JSON.parse(JSON.stringify(arg)) : undefined;

const logViewer = {
  /**
   * Invokes a whitelisted main-process channel.
   *
   * @param channel The channel to invoke.
   * @param args Arguments forwarded to the main process.
   * @returns Promise of the handler result.
   */
  invoke: async (channel: string, ...args: unknown[]) => {
    if (ALLOWED_INVOKE_CHANNELS.has(channel)) {
      // Safe clone arguments to strip prototype pollution
      const safeArgs = args.map(cloneArg);
      return ipcRenderer.invoke(channel, ...safeArgs);
    }
    console.warn(`Blocked unauthorized outgoing IPC invoke: ${channel}`);
    throw new Error(`Unauthorized IPC invoke: ${channel}`);
  },
  /**
   * Subscribes to a whitelisted main-to-renderer channel.
   *
   * @param channel The channel to listen on.
   * @param listener Called with the pushed arguments.
   * @returns Unsubscribe function.
   */
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    if (ALLOWED_ON_CHANNELS.has(channel)) {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        ...args: unknown[]
      ) => listener(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    console.warn(`Blocked unauthorized incoming IPC listener: ${channel}`);
    return () => {};
  },
  /**
   * Synchronously queries a whitelisted main-process channel.
   *
   * @param channel The channel to query.
   * @param args Arguments forwarded to the main process.
   * @returns The handler result, or `null` when blocked.
   */
  sendSync: (channel: string, ...args: unknown[]) => {
    // Specifically allow get-server-tag for the logging preload
    if (channel === 'log-viewer-window/get-server-tag') {
      const safeArgs = args.map(cloneArg);
      return ipcRenderer.sendSync(channel, ...safeArgs);
    }
    console.warn(`Blocked unauthorized outgoing IPC sendSync: ${channel}`);
    return null;
  },
};

contextBridge.exposeInMainWorld('RocketChatDesktop', {
  logViewer,
});
