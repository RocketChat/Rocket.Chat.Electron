import log from 'electron-log/renderer';

import { getProcessContext, getComponentContext } from './context';

// Function to override console methods in renderer processes with enhanced context
try {
  // Get process context once
  const processContext = getProcessContext();

  if (typeof console !== 'undefined') {
    // Store original console methods
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    // Override console.log to use electron-log debug level with context
    console.log = (...args: any[]) => {
      try {
        const component = getComponentContext();
        const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
        log.debug(contextStr, ...args);
      } catch {
        originalConsole.log(...args);
      }
    };

    // Override console.info to use electron-log info level with context
    console.info = (...args: any[]) => {
      try {
        const component = getComponentContext();
        const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
        log.info(contextStr, ...args);
      } catch {
        originalConsole.info(...args);
      }
    };

    // Override console.warn to use electron-log warn level with context
    console.warn = (...args: any[]) => {
      try {
        const component = getComponentContext(true);
        const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
        log.warn(contextStr, ...args);
      } catch {
        originalConsole.warn(...args);
      }
    };

    // Override console.error to use electron-log error level with context
    console.error = (...args: any[]) => {
      try {
        const component = getComponentContext(true);
        const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
        log.error(contextStr, ...args);
      } catch {
        originalConsole.error(...args);
      }
    };

    // Override console.debug to use electron-log debug level with context
    console.debug = (...args: any[]) => {
      try {
        const component = getComponentContext();
        const contextStr = `[${processContext}]${component !== 'general' ? ` [${component}]` : ''}`;
        log.debug(contextStr, ...args);
      } catch {
        originalConsole.debug(...args);
      }
    };

    // Add marker to know console override is active
    (console as any).original = originalConsole;
  }
} catch (error) {
  // Silently fail if electron-log isn't available in this context
}
