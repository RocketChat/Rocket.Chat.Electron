import { ipcRenderer } from 'electron';

const sanitize = (args: unknown[]): unknown[] => structuredClone(args);

// Define allowed channels for the webview preload environment.
// This prevents the untrusted server view from exploiting the contextBridge
// to send unauthorized IPC messages to the main process or other windows.
const ALLOWED_CHANNELS = new Set([
  'redux/get-initial-state',
  'redux/action-dispatched',
  'servers/fetch-info',
  'notifications/fetch-icon',
  'power-monitor/get-system-idle-state',
  'certificatesManager/remove',
  'server-view/get-url',
  'ui-preview/apply',
  'ui-preview/restore',
  'ui-preview/add',
  'ui-preview/refresh',
  'server-view/ready',
  'server-view/open-url-on-browser',
  'server-view/take-pending-conference',
  'video-call-window/open-window',
  'video-call-window/open-url',
  'video-call-window/open-in-main-window',
  'video-call-window/open-screen-picker',
  'video-call-window/screen-sharing-source-responded',
  'video-call-window/screen-recording-is-permission-granted',
  'video-call-window/close-requested',
  'video-call-window/open-webview-dev-tools',
  'video-call-window/handshake',
  'video-call-window/renderer-ready',
  'video-call-window/request-url',
  'video-call-window/url-received',
  'video-call-window/webview-created',
  'video-call-window/webview-loading',
  'video-call-window/webview-ready',
  'video-call-window/webview-failed',
  'video-call-window/get-language',
  'video-call-window/prewarm-capturer-cache',
  'video-call-window/media-capture-changed',
  'jitsi-desktop-capturer-get-sources',
  'desktop-capturer-get-sources',
  'outlook-calendar/get-events',
  'outlook-calendar/set-exchange-url',
  'outlook-calendar/has-credentials',
  'outlook-calendar/clear-credentials',
  'outlook-calendar/set-user-token',
  'browser/open-url',
  'document-viewer/open-window',
  'document-viewer/fetch-content',
  'secondary-window/minimize',
  'secondary-window/toggle-maximize',
  'secondary-window/close',
  'secondary-window/is-maximized',
  'screen-picker/open',
  'screen-picker/source-responded',
  'screen-picker/screen-recording-is-permission-granted',
  'screen-picker/open-url',
  'telephony/get-diagnostics',
  'presence/change-requested',
  'navigate-to-route',
  'log-viewer-window/get-server-tag',
]);

const originalSend = ipcRenderer.send.bind(ipcRenderer);
const originalInvoke = ipcRenderer.invoke.bind(ipcRenderer);
const originalOn = ipcRenderer.on.bind(ipcRenderer);
const originalSendSync = ipcRenderer.sendSync.bind(ipcRenderer);

const isAllowedChannel = (channel: string): boolean => {
  if (ALLOWED_CHANNELS.has(channel)) {
    return true;
  }
  const match = channel.match(/^([^@]+)@[\w-]+$/);
  return Boolean(match && ALLOWED_CHANNELS.has(match[1]));
};

ipcRenderer.send = (channel: string, ...args: unknown[]) => {
  if (!isAllowedChannel(channel)) {
    console.warn(`Blocked unauthorized IPC send channel: ${channel}`);
    return;
  }
  originalSend(channel, ...sanitize(args));
};

ipcRenderer.invoke = (channel: string, ...args: unknown[]) => {
  if (!ALLOWED_CHANNELS.has(channel)) {
    console.warn(`Blocked unauthorized IPC invoke channel: ${channel}`);
    return Promise.reject(new Error('Unauthorized IPC'));
  }
  return originalInvoke(channel, ...sanitize(args));
};

ipcRenderer.sendSync = (channel: string, ...args: unknown[]) => {
  if (!ALLOWED_CHANNELS.has(channel)) {
    console.warn(`Blocked unauthorized IPC sendSync channel: ${channel}`);
    return undefined;
  }
  return originalSendSync(channel, ...sanitize(args));
};

ipcRenderer.on = (
  channel: string,
  listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void
) => {
  if (!isAllowedChannel(channel)) {
    console.warn(`Blocked unauthorized IPC on channel: ${channel}`);
    return ipcRenderer;
  }
  return originalOn(channel, listener);
};
