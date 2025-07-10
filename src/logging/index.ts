import path from 'path';

import { app, session } from 'electron';
import log from 'electron-log';

// Function to override console methods with electron-log
const overrideConsole = () => {
  // Store original console methods for fallback
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  try {
    // Override console.log to use electron-log debug level
    console.log = (...args: any[]) => {
      log.debug(...args);
    };

    // Override console.info to use electron-log info level
    console.info = (...args: any[]) => {
      log.info(...args);
    };

    // Override console.warn to use electron-log warn level
    console.warn = (...args: any[]) => {
      log.warn(...args);
    };

    // Override console.error to use electron-log error level
    console.error = (...args: any[]) => {
      log.error(...args);
    };

    // Override console.debug to use electron-log debug level
    console.debug = (...args: any[]) => {
      log.debug(...args);
    };

    // Add a way to access original console if needed
    (console as any).original = originalConsole;
  } catch (error) {
    // If override fails, restore original console
    Object.assign(console, originalConsole);
    originalConsole.warn('Failed to override console methods:', error);
  }
};

// Simple configuration that works in both main and renderer processes
const configureLogging = () => {
  try {
    // Only configure transports if they exist (main process)
    if (log.transports && log.transports.console && log.transports.file) {
      // Set log level based on environment
      if (process.env.NODE_ENV === 'development') {
        log.transports.console.level = 'debug';
        log.transports.file.level = 'debug';
      } else {
        log.transports.console.level = 'info';
        log.transports.file.level = 'info';
      }

      // Configure file transport
      log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
      log.transports.file.format =
        '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

      // Configure console transport
      log.transports.console.format =
        '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

      // Initialize for renderer processes if we're in main process
      if (process.type === 'browser') {
        log.initialize();
      }
    }

    // Override console.log to use electron-log
    overrideConsole();
  } catch (error) {
    // Fallback to console if electron-log fails
    console.warn('Failed to configure electron-log:', error);
  }

  return log;
};

// Function to setup logging in webviews and all webContents
export const setupWebContentsLogging = () => {
  if (process.type !== 'browser') return;

  try {
    // Create a preload script that will be injected into all webContents
    const loggingPreloadPath = path.join(
      app.getAppPath(),
      'app/logging-preload.js'
    );

    // Listen for new webContents creation
    app.on('web-contents-created', (event, webContents) => {
      // Skip if this is the main renderer process (it already has logging)
      if (webContents.getType() === 'window') return;

      // For webviews and other renderer processes, inject console override
      webContents.on('dom-ready', () => {
        try {
          // Inject console override directly into the webContents
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

                // Override console methods to send to main process
                console.log = (...args) => {
                  originalConsole.log(...args);
                  ipcRenderer.send('console-log', 'debug', ...args);
                };
                
                console.info = (...args) => {
                  originalConsole.info(...args);
                  ipcRenderer.send('console-log', 'info', ...args);
                };
                
                console.warn = (...args) => {
                  originalConsole.warn(...args);
                  ipcRenderer.send('console-log', 'warn', ...args);
                };
                
                console.error = (...args) => {
                  originalConsole.error(...args);
                  ipcRenderer.send('console-log', 'error', ...args);
                };
                
                console.debug = (...args) => {
                  originalConsole.debug(...args);
                  ipcRenderer.send('console-log', 'debug', ...args);
                };

                // Add marker to know console override is active
                console.original = originalConsole;
              } catch (error) {
                // Silently fail if electron-log isn't available
              }
            })();
          `;

          webContents.executeJavaScript(consoleOverrideScript);
        } catch (error) {
          // Silently fail if injection fails
        }
      });
    });

    // Handle console messages from renderer processes
    const { ipcMain } = require('electron');
    ipcMain.on('console-log', (event, level, ...args) => {
      try {
        switch (level) {
          case 'info':
            log.info(...args);
            break;
          case 'warn':
            log.warn(...args);
            break;
          case 'error':
            log.error(...args);
            break;
          case 'debug':
          default:
            log.debug(...args);
            break;
        }
      } catch (error) {
        // Fallback to original console if electron-log fails
        console.warn('Failed to log from renderer:', error);
      }
    });
  } catch (error) {
    console.warn('Failed to setup webContents logging:', error);
  }
};

// Export the configured logger
export const logger = configureLogging();

// Export electron-log for direct use if needed
export default log;

// Export utility functions
export * from './utils';
