import { getAvailableBrowsers, launchBrowser } from 'detect-browsers';
import type { Browser } from 'detect-browsers';
import { shell } from 'electron';

import { readSetting } from '../store/readSetting';

// Cache browsers to avoid repeatedly fetching them
let cachedBrowsers: Browser[] | null = null;

/**
 * Launches a URL in the selected browser from settings or falls back to system default
 *
 * @param url The URL to open
 * @returns Promise that resolves when the browser is launched
 */
export const openExternal = async (url: string): Promise<void> => {
  // Get the selected browser from settings
  const selectedBrowser = readSetting('selectedBrowser');

  // If no specific browser is selected, use the system default
  if (!selectedBrowser) {
    return shell.openExternal(url);
  }

  try {
    // Get available browsers if we haven't cached them yet
    if (!cachedBrowsers) {
      cachedBrowsers = await getAvailableBrowsers();
    }

    // Find the selected browser in the available browsers
    const browser = cachedBrowsers.find(
      (browser) => browser.browser === selectedBrowser
    );

    if (browser) {
      // Launch the selected browser with the URL
      return launchBrowser(browser, url);
    }
    // If the selected browser isn't available, fall back to system default
    console.warn(
      `Selected browser "${selectedBrowser}" not found, using system default.`
    );
    return shell.openExternal(url);
  } catch (error) {
    console.error('Error launching browser:', error);
    // Fall back to shell.openExternal on error
    return shell.openExternal(url);
  }
};
