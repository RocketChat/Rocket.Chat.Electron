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
  }
} catch (error) {
  // Silently fail if electron-log isn't available in this context
}
