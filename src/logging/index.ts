import fs from 'fs';
import path from 'path';

import type { WebContents } from 'electron';
import { app, webContents, ipcMain } from 'electron';
import log from 'electron-log';

import { select, watch } from '../store';
import type { RootState } from '../store/rootReducer';
import {
  getLogContext,
  formatLogContext,
  cleanupServerContext,
} from './context';
import { LogDeduplicator } from './dedup';
import { logLoggingFailure } from './fallback';
import { createPrivacyHook, redactSensitiveData } from './privacy';

// Shared dedup instance — created once, used by both file hook and IPC handler
let logDeduplicator: LogDeduplicator | null = null;

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

// Enhanced console override with context
const overrideConsole = () => {
  try {
    // Override console.log to use electron-log debug level with context
    console.log = (...args: any[]) => {
      const context = getLogContext();
      const contextStr = formatLogContext(context);
      log.debug(contextStr, ...args);
    };

    // Override console.info to use electron-log info level with context
    console.info = (...args: any[]) => {
      const context = getLogContext();
      const contextStr = formatLogContext(context);
      log.info(contextStr, ...args);
    };

    // Override console.warn to use electron-log warn level with context
    console.warn = (...args: any[]) => {
      const context = getLogContext();
      const contextStr = formatLogContext(context);
      log.warn(contextStr, ...args);
    };

    // Override console.error to use electron-log error level with context
    console.error = (...args: any[]) => {
      const context = getLogContext();
      const contextStr = formatLogContext(context);
      log.error(contextStr, ...args);
    };

    // Override console.debug to use electron-log debug level with context
    console.debug = (...args: any[]) => {
      const context = getLogContext();
      const contextStr = formatLogContext(context);
      log.debug(contextStr, ...args);
    };

    // Add a way to access original console if needed
    (console as any).original = originalConsole;
  } catch (error) {
    // If override fails, restore original console
    Object.assign(console, originalConsole);
    originalConsole.warn('Failed to override console methods:', error);
  }
};

// Enhanced logging function with context
export const logWithContext = (
  level: 'debug' | 'info' | 'warn' | 'error',
  webContentsInstance?: WebContents,
  ...args: any[]
) => {
  const context = getLogContext(webContentsInstance);
  const contextStr = formatLogContext(context);

  switch (level) {
    case 'debug':
      log.debug(contextStr, ...args);
      break;
    case 'info':
      log.info(contextStr, ...args);
      break;
    case 'warn':
      log.warn(contextStr, ...args);
      break;
    case 'error':
      log.error(contextStr, ...args);
      break;
  }
};

// Simple configuration that works in both main and renderer processes
const configureLogging = () => {
  try {
    // Only configure transports if they exist (main process)
    if (log.transports?.console && log.transports?.file) {
      // Set log level based on environment
      if (process.env.NODE_ENV === 'development') {
        log.transports.console.level = 'debug';
        log.transports.file.level = 'debug';
      } else {
        log.transports.console.level = 'info';
        log.transports.file.level = 'info';
      }

      // Configure file transport with enhanced format
      log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
      log.transports.file.format =
        '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
      // Enable async writes — batches multiple log lines into single fs.writeFile calls
      (log.transports.file as any).sync = false;
      // Let electron-log use its default path: ~/Library/Logs/{app name}/main.log

      // Configure console transport with enhanced format
      log.transports.console.format =
        '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

      // Use original console to prevent recursion when console is overridden
      log.transports.console.writeFn = ({ message }) => {
        originalConsole.log(message);
      };

      // Add privacy hook FIRST so all data is redacted before other hooks
      log.hooks.push(createPrivacyHook());

      // Add dedup hook — suppresses repeated non-error messages at the file
      // transport only (console stays verbose for live debugging)
      logDeduplicator = new LogDeduplicator();
      log.hooks.push(logDeduplicator.createFileHook());

      // Add structured NDJSON logging for errors (useful for error reporting)
      const errorJsonlPath = path.join(app.getPath('logs'), 'errors.jsonl');
      const MAX_ERROR_LOG_SIZE = 5 * 1024 * 1024; // 5MB
      const errorJsonlBuffer: string[] = [];
      const ERRORS_FLUSH_INTERVAL_MS = 10_000;
      const MAX_BUFFERED_ERRORS = 50;

      const flushErrorJsonl = () => {
        if (errorJsonlBuffer.length === 0) return;
        const batch = errorJsonlBuffer.splice(0);
        const content = batch.join('');

        // Check size and truncate if needed before appending
        try {
          if (fs.existsSync(errorJsonlPath)) {
            const stats = fs.statSync(errorJsonlPath);
            if (stats.size > MAX_ERROR_LOG_SIZE) {
              const fileContent = fs.readFileSync(errorJsonlPath, 'utf-8');
              const lines = fileContent.split('\n');
              const halfIndex = Math.floor(lines.length / 2);
              fs.writeFileSync(
                errorJsonlPath,
                lines.slice(halfIndex).join('\n')
              );
            }
          }
        } catch {
          // Non-critical: truncation failure
        }

        fs.promises.appendFile(errorJsonlPath, content).catch((err) => {
          originalConsole.error('Failed to write error log:', err);
        });
      };

      const errorFlushTimer = setInterval(
        flushErrorJsonl,
        ERRORS_FLUSH_INTERVAL_MS
      );

      log.hooks.push((message: any) => {
        if (message.level === 'error') {
          try {
            const rawText = message.data?.join(' ') || '';
            errorJsonlBuffer.push(
              `${JSON.stringify({
                timestamp: new Date().toISOString(),
                level: message.level,
                text: redactSensitiveData(rawText),
                version: app.getVersion(),
              })}\n`
            );

            if (errorJsonlBuffer.length >= MAX_BUFFERED_ERRORS) {
              flushErrorJsonl();
            }
          } catch {
            // Ignore JSON logging failures
          }
        }
        return message;
      });

      // Flush error buffer before app quits
      if (process.type === 'browser') {
        app.on('before-quit', () => {
          flushErrorJsonl();
          clearInterval(errorFlushTimer);
        });
      }

      // Initialize for renderer processes if we're in main process
      if (process.type === 'browser') {
        log.initialize();
      }

      // Restrict log file permissions to owner-only (0600)
      try {
        const logFilePath = path.join(app.getPath('logs'), 'main.log');
        if (fs.existsSync(logFilePath)) {
          fs.chmodSync(logFilePath, 0o600);
        }
        if (fs.existsSync(errorJsonlPath)) {
          fs.chmodSync(errorJsonlPath, 0o600);
        }
      } catch {
        // Non-critical: chmod may fail on Windows
      }
    }

    // Override console.log to use electron-log
    overrideConsole();
  } catch (error) {
    logLoggingFailure(error, 'configureLogging');
  }

  return log;
};

// Function to setup logging in webviews and all webContents
export const setupWebContentsLogging = () => {
  if (process.type !== 'browser') return;

  try {
    // Use the static import for store instead of dynamic imports
    let selectFunction: typeof select | null = null;

    try {
      selectFunction = select;
    } catch (importError: any) {
      // If store import fails, continue without server context mapping
      console.warn(
        '[main] [app] Store module not available for server context mapping:',
        importError.message
      );
    }

    // Rate limiting for console-log IPC to prevent flooding from compromised webviews
    const ipcRateLimit = new Map<
      number,
      { count: number; resetTime: number }
    >();
    const MAX_IPC_MESSAGES_PER_SECOND = 100;

    // Listen for new webContents creation
    app.on('web-contents-created', (_event, webContents) => {
      // Skip if this is the main renderer process (it already has logging)
      if (webContents.getType() === 'window') return;

      // For webviews and other renderer processes, inject console override
      webContents.on('dom-ready', () => {
        try {
          // Get server context for this webContents if store is available
          let serverUrl = 'unknown';
          if (selectFunction) {
            try {
              const servers = selectFunction(
                (state: RootState) => state.servers
              );
              const server = servers.find(
                (s: any) => s.webContentsId === webContents.id
              );
              serverUrl = server?.url || 'unknown';
            } catch (storeError) {
              logLoggingFailure(
                storeError,
                'setupWebContentsLogging - store access'
              );
            }
          }

          // TODO: Replace executeJavaScript injection with a preload script for
          // better maintainability and debuggability (see src/logging/preload.ts)
          // Inject enhanced console override directly into the webContents
          const consoleOverrideScript = `
            (function() {
              try {
                const { ipcRenderer } = require('electron');
                
                // Store original console methods
                const originalConsole = {
                  log: console.log,
                  info: console.info,
                  warn: console.warn,
                  error: console.error,
                  debug: console.debug,
                };

                 // Get webContents ID and server URL for context
                 const webContentsId = ${webContents.id};
                 const serverUrl = ${JSON.stringify(serverUrl)};


                // Override console methods to send to main process with context
                console.log = (...args) => {
                  originalConsole.log(...args);
                  ipcRenderer.send('console-log', 'debug', webContentsId, serverUrl, ...args);
                };
                
                console.info = (...args) => {
                  originalConsole.info(...args);
                  ipcRenderer.send('console-log', 'info', webContentsId, serverUrl, ...args);
                };
                
                console.warn = (...args) => {
                  originalConsole.warn(...args);
                  ipcRenderer.send('console-log', 'warn', webContentsId, serverUrl, ...args);
                };
                
                console.error = (...args) => {
                  originalConsole.error(...args);
                  ipcRenderer.send('console-log', 'error', webContentsId, serverUrl, ...args);
                };
                
                console.debug = (...args) => {
                  originalConsole.debug(...args);
                  ipcRenderer.send('console-log', 'debug', webContentsId, serverUrl, ...args);
                };

                // Add marker to know console override is active
                console.original = originalConsole;
               } catch (error) {
                 console.error('[logging] Failed to override console in webContents:', error);
               }
            })();
          `;

          webContents.executeJavaScript(consoleOverrideScript).catch((err) => {
            log.warn(
              `[logging] Failed to inject console override into webContents ${webContents.id}:`,
              err
            );
          });
        } catch (error) {
          logLoggingFailure(
            error,
            'setupWebContentsLogging - webContents injection'
          );
        }
      });

      // Clean up context and rate limit state when webContents is destroyed
      webContents.on('destroyed', () => {
        cleanupServerContext(webContents.id);
        ipcRateLimit.delete(webContents.id);
      });
    });

    // Handle console messages from renderer processes with enhanced context
    ipcMain.on(
      'console-log',
      (event, level, webContentsId, _serverUrl, ...args) => {
        try {
          const now = Date.now();
          let rateState = ipcRateLimit.get(webContentsId);
          if (!rateState || now > rateState.resetTime) {
            rateState = { count: 0, resetTime: now + 1000 };
            ipcRateLimit.set(webContentsId, rateState);
          }
          rateState.count++;
          if (rateState.count > MAX_IPC_MESSAGES_PER_SECOND) {
            return;
          }
          // Find the webContents that sent this message
          const senderWebContents =
            webContents.fromId(webContentsId) || event.sender;

          // Create enhanced context string with server info
          let contextStr = '';

          if (selectFunction) {
            try {
              const servers = selectFunction(
                (state: RootState) => state.servers
              );
              const server = servers.find(
                (s: any) => s.webContentsId === webContentsId
              );

              // Get base context
              const context = getLogContext(senderWebContents);
              contextStr = formatLogContext(context);

              // Add server context if this is from a webview
              if (server && senderWebContents.getType() === 'webview') {
                // Replace or add server context based on the server URL
                const serverIndex =
                  servers.findIndex((s: any) => s.url === server.url) + 1;
                contextStr = contextStr.replace(
                  '[renderer:webview]',
                  `[renderer:webview] [server-${serverIndex}]`
                );
              }
            } catch (storeError) {
              // Fallback to basic context if store access fails
              const context = getLogContext(senderWebContents);
              contextStr = formatLogContext(context);
            }
          } else {
            // Fallback to basic context if store is not available
            const context = getLogContext(senderWebContents);
            contextStr = formatLogContext(context);
          }

          // Dedup non-error IPC messages before they reach electron-log
          if (
            logDeduplicator &&
            !logDeduplicator.shouldLog(level, contextStr, args)
          ) {
            return;
          }

          // Log with enhanced context
          switch (level) {
            case 'debug':
            case 'verbose':
            case 'silly':
              log.debug(contextStr, ...args);
              break;
            case 'info':
              log.info(contextStr, ...args);
              break;
            case 'warn':
              log.warn(contextStr, ...args);
              break;
            case 'error':
              log.error(contextStr, ...args);
              break;
            default:
              log.info(contextStr, ...args);
              break;
          }
        } catch (error) {
          logLoggingFailure(error, 'console-log IPC handler');
        }
      }
    );
  } catch (error) {
    console.warn('[main] [app] Failed to setup webContents logging:', error);
  }
};

/**
 * Set log level at runtime (useful for debugging without restart)
 */
export const setLogLevel = (
  level: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'
): void => {
  if (log.transports?.console) {
    log.transports.console.level = level;
  }
  if (log.transports?.file) {
    log.transports.file.level = level;
  }
  console.info(`[logging] Log level changed to: ${level}`);
};

/**
 * Get current log level
 */
export const getLogLevel = (): string => {
  return (log.transports?.file?.level as string) || 'info';
};

/**
 * Watch the debug logging toggle in Redux and update log level at runtime.
 * Called after store is initialized.
 */
export const setupDebugLoggingWatch = (): void => {
  if (process.type !== 'browser') return;

  try {
    const isEnabled = select((state: RootState) => state.isDebugLoggingEnabled);
    if (isEnabled) {
      setLogLevel('debug');
    }

    watch(
      (state: RootState) => state.isDebugLoggingEnabled,
      (enabled) => {
        setLogLevel(enabled ? 'debug' : 'info');
      }
    );
  } catch {
    // Store may not be initialized yet — will apply on next toggle
  }
};

// Export the configured logger
export const logger = configureLogging();

// Export electron-log for direct use if needed
export default log;

// Export utility functions
export * from './utils';
export * from './context';
export * from './scopes';
export * from './cleanup';
