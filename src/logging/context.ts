import type { WebContents } from 'electron';

// Server context mapping - anonymous server identification
const serverContextMap = new Map<number, string>();
let serverCounter = 0;

export interface LogContext {
  process: string;
  server?: string;
  component?: string;
  webContentsId?: number;
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
    return serverContextMap.get(webContentsId)!;
  }

  // For main window, it's local
  if (webContents.getType() === 'window') {
    serverContextMap.set(webContentsId, 'local');
    return 'local';
  }

  // For webviews, assign anonymous server ID
  if (webContents.getType() === 'webview') {
    serverCounter++;
    const serverContext = `server-${serverCounter}`;
    serverContextMap.set(webContentsId, serverContext);
    return serverContext;
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
    return 'notification';
  }

  if (stack.includes('update') || stack.includes('Update')) {
    return 'update';
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
export const getLogContext = (webContents?: WebContents): LogContext => {
  const context: LogContext = {
    process: getProcessContext(),
  };

  // Add server context if webContents is provided
  if (webContents) {
    context.server = getServerContext(webContents);
    context.webContentsId = webContents.id;
  }

  // Add component context
  context.component = getComponentContext();

  return context;
};

/**
 * Format context for logging
 */
export const formatLogContext = (context: LogContext): string => {
  const parts: string[] = [];

  // Always include process
  parts.push(context.process);

  // Add server context if available
  if (context.server && context.server !== 'local') {
    parts.push(context.server);
  }

  // Add component context
  if (context.component && context.component !== 'general') {
    parts.push(context.component);
  }

  return parts.map((part) => `[${part}]`).join(' ');
};

/**
 * Clean up server context mapping when webContents is destroyed
 */
export const cleanupServerContext = (webContentsId: number): void => {
  serverContextMap.delete(webContentsId);
};

/**
 * Get current server mappings (for debugging)
 */
export const getServerMappings = (): Map<number, string> => {
  return new Map(serverContextMap);
};
