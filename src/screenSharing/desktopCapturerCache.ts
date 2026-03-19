import { desktopCapturer } from 'electron';

import { handle } from '../ipc/main';

const DESKTOP_CAPTURER_STALE_THRESHOLD = 3000;
const SOURCE_VALIDATION_CACHE_TTL = 30000;

let desktopCapturerCache: {
  sources: Electron.DesktopCapturerSource[];
  timestamp: number;
} | null = null;

let desktopCapturerPromise: Promise<Electron.DesktopCapturerSource[]> | null =
  null;

const sourceValidationCache: Set<string> = new Set();
let sourceValidationCacheTimestamp = 0;

export const refreshDesktopCapturerCache = (
  options: Electron.SourcesOptions
): void => {
  if (desktopCapturerPromise) return;

  desktopCapturerPromise = (async () => {
    try {
      const sources = await desktopCapturer.getSources(options);

      const validSources = sources.filter((source) => {
        if (!source.name || source.name.trim() === '') {
          return false;
        }

        const now = Date.now();
        const cacheExpired =
          now - sourceValidationCacheTimestamp > SOURCE_VALIDATION_CACHE_TTL;

        if (!cacheExpired && sourceValidationCache.has(source.id)) {
          return true;
        }

        if (source.thumbnail.isEmpty()) {
          return false;
        }

        if (cacheExpired) {
          sourceValidationCache.clear();
          sourceValidationCacheTimestamp = now;
        }
        sourceValidationCache.add(source.id);

        return true;
      });

      desktopCapturerCache = {
        sources: validSources,
        timestamp: Date.now(),
      };

      return validSources;
    } catch (error) {
      console.error('Background cache refresh failed:', error);
      return desktopCapturerCache?.sources || [];
    } finally {
      desktopCapturerPromise = null;
    }
  })();
};

export const prewarmDesktopCapturerCache = (): void => {
  refreshDesktopCapturerCache({ types: ['window', 'screen'] });
};

export const clearDesktopCapturerCache = (): void => {
  desktopCapturerCache = null;
  desktopCapturerPromise = null;
  sourceValidationCache.clear();
  sourceValidationCacheTimestamp = 0;
};

export const getDesktopCapturerCacheStatus = (): {
  cached: boolean;
  pending: boolean;
} => ({
  cached: desktopCapturerCache !== null,
  pending: desktopCapturerPromise !== null,
});

export const handleDesktopCapturerGetSources = (): void => {
  handle('desktop-capturer-get-sources', async (_webContents, opts) => {
    try {
      const options = Array.isArray(opts) ? opts[0] : opts;

      if (desktopCapturerCache) {
        const isStale =
          Date.now() - desktopCapturerCache.timestamp >
          DESKTOP_CAPTURER_STALE_THRESHOLD;
        if (isStale && !desktopCapturerPromise) {
          refreshDesktopCapturerCache(options);
        }
        return desktopCapturerCache.sources;
      }

      if (desktopCapturerPromise) {
        return await desktopCapturerPromise;
      }

      refreshDesktopCapturerCache(options);
      if (desktopCapturerPromise) {
        return await desktopCapturerPromise;
      }
      return [];
    } catch (error) {
      console.error('Error in desktop capturer handler:', error);
      return desktopCapturerCache?.sources || [];
    }
  });
};
