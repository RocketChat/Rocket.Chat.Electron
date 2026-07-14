import { desktopCapturer } from 'electron';

import { handle } from '../ipc/main';

const STALE_THRESHOLD = 5000;
const ENUMERATION_COOLDOWN = 4000;

type Bucket = {
  sources: Electron.DesktopCapturerSource[];
  timestamp: number;
} | null;

type BucketType = 'screens' | 'windows';

const buckets: Record<BucketType, Bucket> = {
  screens: null,
  windows: null,
};

let enumerationPromise: Promise<void> | null = null;
let lastEnumerationCompletedAt = 0;
let warnedEmptyOnce: Record<BucketType, boolean> = {
  screens: false,
  windows: false,
};

const typeForBucket = (bucket: BucketType): Electron.SourcesOptions['types'] =>
  bucket === 'screens' ? ['screen'] : ['window'];

const isStale = (bucket: Bucket): boolean =>
  !bucket || Date.now() - bucket.timestamp > STALE_THRESHOLD;

const cooldownElapsed = (): boolean =>
  Date.now() - lastEnumerationCompletedAt >= ENUMERATION_COOLDOWN;

const mergeWithPrevious = (
  bucketType: BucketType,
  incoming: Electron.DesktopCapturerSource[]
): Electron.DesktopCapturerSource[] => {
  const previous = buckets[bucketType];
  const previousById = new Map(
    (previous?.sources ?? []).map((source) => [source.id, source])
  );

  const merged: Electron.DesktopCapturerSource[] = [];
  incoming.forEach((source) => {
    if (!source.name || source.name.trim() === '') {
      return;
    }

    if (source.thumbnail.isEmpty()) {
      const previousSource = previousById.get(source.id);
      if (previousSource && !previousSource.thumbnail.isEmpty()) {
        merged.push({ ...source, thumbnail: previousSource.thumbnail });
        return;
      }
      // No cached fallback for a blank thumbnail: drop it.
      return;
    }

    merged.push(source);
  });

  return merged;
};

const enumerateBucket = async (bucketType: BucketType): Promise<void> => {
  try {
    const sources = await desktopCapturer.getSources({
      types: typeForBucket(bucketType),
    });

    if (sources.length === 0) {
      if (buckets[bucketType] && buckets[bucketType]!.sources.length > 0) {
        if (!warnedEmptyOnce[bucketType]) {
          console.warn(
            `Desktop capturer returned no ${bucketType}; keeping previous cache`
          );
          warnedEmptyOnce[bucketType] = true;
        }
        return;
      }
      buckets[bucketType] = { sources: [], timestamp: Date.now() };
      return;
    }

    warnedEmptyOnce[bucketType] = false;
    const merged = mergeWithPrevious(bucketType, sources);
    buckets[bucketType] = { sources: merged, timestamp: Date.now() };
  } catch (error) {
    console.error(`Background cache refresh failed for ${bucketType}:`, error);
    // Preserve the existing bucket unchanged on error.
  } finally {
    lastEnumerationCompletedAt = Date.now();
  }
};

const scheduleRefresh = (
  bucketType: BucketType,
  bypassCooldown = false
): Promise<void> => {
  if (enumerationPromise) return enumerationPromise;
  if (!bypassCooldown && !cooldownElapsed()) return Promise.resolve();

  enumerationPromise = enumerateBucket(bucketType).finally(() => {
    enumerationPromise = null;
  });
  return enumerationPromise;
};

const stalestBucket = (): BucketType => {
  const screensTs = buckets.screens?.timestamp ?? 0;
  const windowsTs = buckets.windows?.timestamp ?? 0;
  return screensTs <= windowsTs ? 'screens' : 'windows';
};

const bucketFromOptions = (
  options?: Electron.SourcesOptions
): BucketType | null => {
  if (!options?.types || options.types.length !== 1) return null;
  if (options.types[0] === 'screen') return 'screens';
  if (options.types[0] === 'window') return 'windows';
  return null;
};

export const refreshDesktopCapturerCache = (
  options?: Electron.SourcesOptions
): void => {
  void scheduleRefresh(bucketFromOptions(options) ?? stalestBucket());
};

export const prewarmDesktopCapturerCache = (): void => {
  if (!buckets.screens && !buckets.windows) {
    // Bootstrap: populating both buckets for the first time is not the
    // back-to-back hammering the cooldown guards against, so the windows
    // kick bypasses it.
    void scheduleRefresh('screens').then(() => {
      void scheduleRefresh('windows', true);
    });
    return;
  }
  void scheduleRefresh(stalestBucket());
};

export const clearDesktopCapturerCache = (): void => {
  buckets.screens = null;
  buckets.windows = null;
  enumerationPromise = null;
  lastEnumerationCompletedAt = 0;
  warnedEmptyOnce = { screens: false, windows: false };
};

export const getDesktopCapturerCacheStatus = (): {
  cached: boolean;
  pending: boolean;
} => ({
  cached: buckets.screens !== null || buckets.windows !== null,
  pending: enumerationPromise !== null,
});

export const getCachedSources = (): Electron.DesktopCapturerSource[] => [
  ...(buckets.screens?.sources ?? []),
  ...(buckets.windows?.sources ?? []),
];

export const handleDesktopCapturerGetSources = (): void => {
  handle('desktop-capturer-get-sources', async (_webContents, _opts) => {
    try {
      if (!buckets.screens && !buckets.windows) {
        // First-ever call: await screens (fast + reliable) so the picker gets
        // content immediately, then kick windows in the background. This is
        // the initial population, not repeated hammering, so the windows
        // kick bypasses the cooldown gate.
        await scheduleRefresh('screens');
        void scheduleRefresh('windows', true);
        return getCachedSources();
      }

      if (
        (isStale(buckets.screens) || isStale(buckets.windows)) &&
        !enumerationPromise &&
        cooldownElapsed()
      ) {
        void scheduleRefresh(stalestBucket());
      }

      return getCachedSources();
    } catch (error) {
      console.error('Error in desktop capturer handler:', error);
      return getCachedSources();
    }
  });
};
