import log from 'electron-log/renderer';

// Function to override console methods in renderer processes
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

    // Log that console override is active in this renderer
    log.debug('Console override activated in renderer process');
  } catch (error) {
    // If override fails, restore original console
    Object.assign(console, originalConsole);
    originalConsole.warn(
      'Failed to override console methods in renderer:',
      error
    );
  }
};

// Apply console override immediately when this preload script loads
overrideConsoleInRenderer();

// Export for manual use if needed
export { overrideConsoleInRenderer };
