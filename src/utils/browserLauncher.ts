import { spawn } from 'child_process';

import { getAvailableBrowsers, launchBrowser } from 'detect-browsers';
import type { Browser } from 'detect-browsers';
import { shell } from 'electron';

import { dispatch } from '../store';
import { readSetting } from '../store/readSetting';
import { SETTINGS_AVAILABLE_BROWSERS_UPDATED } from '../ui/actions';

// Cache browsers to avoid repeatedly fetching them
let cachedBrowsers: Browser[] | null = null;
let browserLoadPromise: Promise<Browser[]> | null = null;

/**
 * Lazy load browsers asynchronously
 * This ensures we don't slow down app startup
 */
const loadBrowsersLazy = (): Promise<Browser[]> => {
  if (cachedBrowsers) {
    return Promise.resolve(cachedBrowsers);
  }

  if (!browserLoadPromise) {
    // Start loading browsers asynchronously after a delay to not block the app startup
    browserLoadPromise = new Promise((resolve) => {
      // Delay browser detection for 2 seconds after this function is first called
      // to avoid slowing down app startup and initial interactions
      setTimeout(async () => {
        try {
          const browsers = await getAvailableBrowsers();
          cachedBrowsers = browsers;

          const browserIds = browsers.map((browser) => browser.browser);
          if (browserIds.length > 0) {
            dispatch({
              type: SETTINGS_AVAILABLE_BROWSERS_UPDATED,
              payload: browserIds,
            });
          }

          resolve(browsers);
        } catch (error) {
          console.error('Error detecting browsers:', error);
          resolve([]);
        }
      }, 2000);
    });
  }

  return browserLoadPromise;
};

const getCleanEnvForLinux = (): Record<string, string | undefined> => {
  const cleanEnv = { ...process.env };
  const varsToRemove = [
    'APPDIR',
    'APPIMAGE',
    'LD_LIBRARY_PATH',
    'APPIMAGE_SILENT_INSTALL',
    'APPIMAGE_START_CWD',
    'GDK_BACKEND',
  ];

  for (const key of varsToRemove) {
    delete cleanEnv[key];
  }

  return cleanEnv;
};

const linuxOpenExternal = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn('xdg-open', [url], {
      detached: true,
      env: getCleanEnvForLinux(),
      stdio: 'ignore',
    });

    child.on('error', (error) => {
      console.error('Failed to open xdg-open', error);
      // Fallback to electron's shell.openExternal
      shell.openExternal(url).then(resolve).catch(reject);
    });

    child.unref();
    resolve();
  });
};

const withCleanEnv = async <T>(action: () => Promise<T>): Promise<T> => {
  if (process.platform !== 'linux') {
    return action();
  }

  const originalEnv: Record<string, string | undefined> = {};
  const varsToRemove = [
    'APPDIR',
    'APPIMAGE',
    'LD_LIBRARY_PATH',
    'APPIMAGE_SILENT_INSTALL',
    'APPIMAGE_START_CWD',
    'GDK_BACKEND',
  ];

  for (const key of varsToRemove) {
    if (process.env[key] !== undefined) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  }

  try {
    return await action();
  } finally {
    for (const key of varsToRemove) {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
  }
};

/**
 * Launches a URL in the selected browser from settings or falls back to system default
 *
 * @param url The URL to open
 * @returns Promise that resolves when the browser is launched
 */
export const openExternal = async (url: string): Promise<void> => {
  const systemOpenExternal = (url: string): Promise<void> => {
    if (process.platform === 'linux') {
      return linuxOpenExternal(url);
    }
    return shell.openExternal(url);
  };

  // Get the selected browser from settings
  const selectedBrowser = readSetting('selectedBrowser');

  // If no specific browser is selected, use the system default
  if (!selectedBrowser) {
    return systemOpenExternal(url);
  }

  try {
    // Lazy load browsers when needed
    const browsers = await loadBrowsersLazy();

    // Find the selected browser in the available browsers
    const browser = browsers.find(
      (browser) => browser.browser === selectedBrowser
    );

    if (browser) {
      // Launch the selected browser with the URL using a clean environment
      return withCleanEnv(() => launchBrowser(browser, url));
    }
    // If the selected browser isn't available, fall back to system default
    console.warn(
      `Selected browser "${selectedBrowser}" not found, using system default.`
    );
    return systemOpenExternal(url);
  } catch (error) {
    console.error('Error launching browser:', error);
    // Fall back to shell.openExternal on error
    return systemOpenExternal(url);
  }
};

/**
 * Trigger preloading of browsers in the background
 * Call this function when the app is fully loaded
 */
export const preloadBrowsersList = (): void => {
  // Begin loading browsers in the background after app is ready
  setTimeout(() => {
    loadBrowsersLazy().catch((error) => {
      console.error('Failed to preload browsers list:', error);
    });
  }, 5000); // Delay for 5 seconds after this function is called
};
