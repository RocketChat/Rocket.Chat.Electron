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
]);

const ALLOWED_ON_CHANNELS = new Set([
  'transparency-enabled', // This is the TRANSPARENCY_CHANNEL string from constants
  'log-viewer-window/transparency-changed',
]);

const logViewer = {
  invoke: async (channel: string, ...args: unknown[]) => {
    if (ALLOWED_INVOKE_CHANNELS.has(channel)) {
      // Safe clone arguments to strip prototype pollution
      const safeArgs = args.map((arg) =>
        arg !== undefined ? JSON.parse(JSON.stringify(arg)) : undefined
      );
      return ipcRenderer.invoke(channel, ...safeArgs);
    }
    console.warn(`Blocked unauthorized outgoing IPC invoke: ${channel}`);
    throw new Error(`Unauthorized IPC invoke: ${channel}`);
  },
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
  sendSync: (channel: string, ...args: unknown[]) => {
    // Specifically allow get-server-tag for the logging preload
    if (channel === 'log-viewer-window/get-server-tag') {
      const safeArgs = args.map((arg) =>
        arg !== undefined ? JSON.parse(JSON.stringify(arg)) : undefined
      );
      return ipcRenderer.sendSync(channel, ...safeArgs);
    }
    console.warn(`Blocked unauthorized outgoing IPC sendSync: ${channel}`);
    return null;
  },
};

contextBridge.exposeInMainWorld('RocketChatDesktop', {
  logViewer,
});
