import type { WebContents } from 'electron';

// Define server context storage map
const serverContextMap = new Map<
  number,
  { serverUrl: string; serverName: string }
>();

const MAX_SERVER_ID = 100;
const availableServerIds: number[] = Array.from(
  { length: MAX_SERVER_ID },
  (_, i) => i + 1
);
const usedServerIds = new Map<number, number>();

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
 * Get server context for webContents (privacy-safe anonymous ID)
 */
export const getServerContext = (webContents?: WebContents): string => {
  if (!webContents) return 'local';

  const webContentsId = webContents.id;

  // Check if we already have a context for this webContents
  if (serverContextMap.has(webContentsId)) {
    return serverContextMap.get(webContentsId)!.serverName;
  }

  // For main window, it's local
  if (webContents.getType() === 'window') {
    serverContextMap.set(webContentsId, {
      serverUrl: 'local',
      serverName: 'local',
    });
    return 'local';
  }

  // For webviews, assign anonymous server ID from pool
  if (webContents.getType() === 'webview') {
    const serverId = availableServerIds.shift() || MAX_SERVER_ID;
    usedServerIds.set(webContentsId, serverId);
    const serverName = `server-${serverId}`;
    serverContextMap.set(webContentsId, {
      serverUrl: 'unknown',
      serverName,
    });
    return serverName;
  }

  return 'unknown';
};

/**
 * Get component context based on the calling code location
 */
export const getComponentContext = (error?: Error): string => {
  if (!error) {
    // Create error to get stack trace
    error = new Error();
  }

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
export const getLogContext = (webContents?: WebContents): ILogContext => {
  const context: ILogContext = {
    processType: getProcessContext(),
  };

  // Add server context if webContents is provided
  if (webContents) {
    context.webContentsType = webContents.getType();
    context.webContentsId = webContents.id;
    const serverContext = getServerContext(webContents);
    context.serverInfo = {
      url: serverContext,
      name: serverContext,
    };
  }

  // Add component context
  context.component = getComponentContext();

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
 * Clean up server context mapping when webContents is destroyed
 */
export const cleanupServerContext = (webContentsId: number): void => {
  serverContextMap.delete(webContentsId);
  const serverId = usedServerIds.get(webContentsId);
  if (serverId !== undefined) {
    availableServerIds.push(serverId);
    usedServerIds.delete(webContentsId);
  }
};

/**
 * Get current server mappings (for debugging)
 */
export const getServerMappings = (): Map<
  number,
  { serverUrl: string; serverName: string }
> => {
  return new Map(serverContextMap);
};

export { MAX_SERVER_ID };
