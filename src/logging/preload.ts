import log from 'electron-log/renderer';

import {
  getProcessContext,
  getComponentContext,
  formatLogContext,
} from './context';

// Function to override console methods in renderer processes with enhanced context
const overrideConsoleInRenderer = () => {
  // Store original console methods for fallback
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  try {
    // Get process context once
    const processContext = getProcessContext();

    // Override console.log to use electron-log debug level with context
    console.log = (...args: any[]) => {
      const component = getComponentContext();
      const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
      log.debug(contextStr, ...args);
    };

    // Override console.info to use electron-log info level with context
    console.info = (...args: any[]) => {
      const component = getComponentContext();
      const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
      log.info(contextStr, ...args);
    };

    // Override console.warn to use electron-log warn level with context
    console.warn = (...args: any[]) => {
      const component = getComponentContext();
      const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
      log.warn(contextStr, ...args);
    };

    // Override console.error to use electron-log error level with context
    console.error = (...args: any[]) => {
      const component = getComponentContext();
      const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
      log.error(contextStr, ...args);
    };

    // Override console.debug to use electron-log debug level with context
    console.debug = (...args: any[]) => {
      const component = getComponentContext();
      const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
      log.debug(contextStr, ...args);
    };

    // Add marker to know console override is active
    (console as any).original = originalConsole;

    // Log that override is active
    log.debug(
      `[${processContext}] [preload] Console override activated in renderer process`
    );
  } catch (error) {
    // If override fails, restore original console
    Object.assign(console, originalConsole);
    originalConsole.warn(
      'Failed to override console methods in renderer:',
      error
    );
  }
};

// Apply the override immediately
overrideConsoleInRenderer();

// Export for manual use if needed
export { overrideConsoleInRenderer };
