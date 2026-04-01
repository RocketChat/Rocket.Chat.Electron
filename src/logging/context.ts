import type { WebContents } from 'electron';

// Maps webContentsId → server hostname (for context lookup)
const webContentsToHostname = new Map<number, string>();

// Define the log context interface
export interface ILogContext {
  processType: string;
  webContentsType?: string;
  webContentsId?: number;
  serverInfo?: {
    url: string;
    name: string;
  };
  component?: string;
}

/**
 * Get process context information
 */
export const getProcessContext = (): string => {
  if (typeof process === 'undefined') return 'unknown';

  if (process.type === 'browser') {
    return 'main';
  }

  if (process.type === 'renderer') {
    // Try to detect renderer type based on environment
    if (typeof window !== 'undefined') {
      // Check if this is the root window
      if (
        window.location?.pathname === '/index.html' ||
        window.location?.pathname === '/'
      ) {
        return 'renderer:root';
      }

      // Check if this is the video call window
      if (window.location?.pathname === '/video-call-window.html') {
        return 'renderer:videocall';
      }

      // Default to webview for other renderer processes
      return 'renderer:webview';
    }

    return 'renderer:unknown';
  }

  return 'preload';
};

/**
 * Extract host (hostname + port when non-default) from a URL.
 */
export const getHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/**
 * Register a webContentsId with a server URL (stores host).
 */
export const registerWebContentsServer = (
  webContentsId: number,
  serverUrl: string
): void => {
  webContentsToHostname.set(webContentsId, getHost(serverUrl));
};

/**
 * Get server context for webContents (hostname-based).
 */
export const getServerContext = (webContents?: WebContents): string => {
  if (!webContents) return 'local';

  const hostname = webContentsToHostname.get(webContents.id);
  if (hostname) {
    return hostname;
  }

  if (webContents.getType() === 'window') {
    return 'local';
  }

  return 'unknown';
};

/**
 * Get component context based on the calling code location
 */
// eslint-disable-next-line complexity
export const getComponentContext = (captureStack = false): string => {
  if (!captureStack) {
    return 'general';
  }

  const error = new Error();
  const stack = error.stack || '';

  // Analyze stack trace to determine component context (privacy-safe)
  if (
    stack.includes('auth') ||
    stack.includes('login') ||
    stack.includes('Login')
  ) {
    return 'auth';
  }

  if (
    stack.includes('connection') ||
    stack.includes('websocket') ||
    stack.includes('network')
  ) {
    return 'connection';
  }

  if (stack.includes('notification') || stack.includes('Notification')) {
    return 'notifications';
  }

  if (stack.includes('update') || stack.includes('Update')) {
    return 'updates';
  }

  if (
    stack.includes('outlook') ||
    stack.includes('Outlook') ||
    stack.includes('outlookCalendar') ||
    stack.includes('getOutlookEvents') ||
    stack.includes('syncEventsWithRocketChatServer')
  ) {
    return 'outlook';
  }

  if (
    stack.includes('server') ||
    stack.includes('Server') ||
    stack.includes('servers')
  ) {
    return 'servers';
  }

  if (
    stack.includes('video') ||
    stack.includes('Video') ||
    stack.includes('jitsi')
  ) {
    return 'videocall';
  }

  if (stack.includes('preload')) {
    return 'preload';
  }

  if (stack.includes('ipc') || stack.includes('IPC')) {
    return 'ipc';
  }

  if (
    stack.includes('storage') ||
    stack.includes('Storage') ||
    stack.includes('store')
  ) {
    return 'storage';
  }

  if (
    stack.includes('ui') ||
    stack.includes('UI') ||
    stack.includes('component')
  ) {
    return 'ui';
  }

  if (
    stack.includes('app') ||
    stack.includes('App') ||
    stack.includes('main')
  ) {
    return 'app';
  }

  return 'general';
};

/**
 * Get complete log context
 */
export const getLogContext = (
  webContents?: WebContents,
  captureComponentStack = false
): ILogContext => {
  const context: ILogContext = {
    processType: getProcessContext(),
  };

  if (webContents) {
    context.webContentsType = webContents.getType();
    context.webContentsId = webContents.id;
    const serverContext = getServerContext(webContents);
    context.serverInfo = {
      url: serverContext,
      name: serverContext,
    };
  }

  context.component = getComponentContext(captureComponentStack);

  return context;
};

/**
 * Format context for logging
 */
export const formatLogContext = (context: ILogContext): string => {
  const parts: string[] = [];

  // Always include process
  parts.push(context.processType);

  // Add server context if available
  if (context.serverInfo?.name && context.serverInfo.name !== 'local') {
    parts.push(context.serverInfo.name);
  }

  // Add component context if available
  if (context.component && context.component !== 'general') {
    parts.push(context.component);
  }

  return `[${parts.join('] [')}]`;
};

/**
 * Clean up webContents association when destroyed.
 */
export const cleanupServerContext = (webContentsId: number): void => {
  webContentsToHostname.delete(webContentsId);
};
