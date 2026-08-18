import { app, shell } from 'electron';

/**
 * Snapshot of `app.isPackaged` taken at module load, i.e. before
 * `setupUpdates` (src/updates/main.ts) can monkey-patch the getter to force
 * it `true` in development (needed to make electron-updater work locally).
 * `isMasBuild` reads this instead of `app.isPackaged` directly so the dev
 * simulation isn't defeated by that patch — this module is imported by
 * main.ts above the `setupUpdates` call, so the capture always runs first.
 */
const isActuallyPackaged = app.isPackaged;

/** Rocket.Chat's Mac App Store listing id, used when the lookup response omits its own link. */
const FALLBACK_APP_STORE_URL = 'https://apps.apple.com/app/id1086818840';

const ITUNES_LOOKUP_URL =
  'https://itunes.apple.com/lookup?bundleId=chat.rocket';

/** Network timeout for the iTunes lookup request. */
const LOOKUP_TIMEOUT_MS = 10_000;

export type AppStoreVersionInfo = {
  version: string;
  storeUrl: string;
};

type ITunesLookupResult = {
  version?: unknown;
  trackViewUrl?: unknown;
};

type ITunesLookupResponse = {
  resultCount?: unknown;
  results?: unknown;
};

/**
 * Whether this build should use the Mac App Store update path (iTunes lookup
 * + "Open App Store" deep link) instead of electron-updater.
 *
 * The `ROCKETCHAT_SIMULATE_MAS` override only takes effect in development,
 * checked two independent ways so it can't be reactivated by accident:
 * `NODE_ENV === 'development'` (rollup.config.mjs bakes this in at build
 * time; release CI always sets `NODE_ENV=production`, see
 * .github/workflows/build-release.yml) and `isActuallyPackaged` (captured at
 * module load, before setupUpdates's dev-mode monkey-patch of
 * `app.isPackaged` can run — see the comment above `isActuallyPackaged`).
 * Requiring both means a local build that forgets to set `NODE_ENV=production`
 * still can't accidentally activate this in a real packaged app, and it stays
 * dead in packaged non-MAS builds either way.
 */
export const isMasBuild = (): boolean => {
  if (process.mas === true) {
    return true;
  }

  return (
    process.env.NODE_ENV === 'development' &&
    !isActuallyPackaged &&
    process.env.ROCKETCHAT_SIMULATE_MAS === 'true'
  );
};

/**
 * Fetches the currently published Mac App Store version for Rocket.Chat via
 * the unauthenticated iTunes Lookup API. Returns `null` on any failure
 * (network error, timeout, no result, or a malformed response) rather than
 * throwing, so callers can fold it into their own error reporting.
 */
export const fetchLatestAppStoreVersion =
  async (): Promise<AppStoreVersionInfo | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

    try {
      const response = await fetch(ITUNES_LOOKUP_URL, {
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as ITunesLookupResponse;

      if (
        typeof data.resultCount !== 'number' ||
        data.resultCount < 1 ||
        !Array.isArray(data.results)
      ) {
        return null;
      }

      const result = data.results[0] as ITunesLookupResult | undefined;

      if (!result || typeof result.version !== 'string' || !result.version) {
        return null;
      }

      const storeUrl =
        typeof result.trackViewUrl === 'string' && result.trackViewUrl
          ? result.trackViewUrl
          : FALLBACK_APP_STORE_URL;

      return { version: result.version, storeUrl };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  };

/** Parses the leading dotted-numeric core of a version string (ignores any prerelease suffix). */
const parseNumericCore = (version: string): number[] =>
  version
    .split('-')[0]
    .split('.')
    .map((segment) => {
      const value = Number.parseInt(segment, 10);
      return Number.isNaN(value) ? 0 : value;
    });

/**
 * Whether the App Store's published version is strictly newer than the local
 * version, comparing only the dotted-numeric core segment by segment (any
 * prerelease suffix on the local version, e.g. `-alpha.1`, is ignored so a
 * matching numeric core never prompts an update).
 */
export const isStoreVersionNewer = (
  storeVersion: string,
  currentVersion: string
): boolean => {
  const storeSegments = parseNumericCore(storeVersion);
  const currentSegments = parseNumericCore(currentVersion);
  const length = Math.max(storeSegments.length, currentSegments.length);

  for (let i = 0; i < length; i += 1) {
    const storeSegment = storeSegments[i] ?? 0;
    const currentSegment = currentSegments[i] ?? 0;

    if (storeSegment > currentSegment) {
      return true;
    }

    if (storeSegment < currentSegment) {
      return false;
    }
  }

  return false;
};

/** Hostnames the App Store deep link is allowed to point at. */
const ALLOWED_STORE_HOSTNAMES = new Set(['apps.apple.com', 'itunes.apple.com']);

/**
 * Validates a store URL before it's handed to `shell.openExternal`: only
 * `https:` URLs pointed at an Apple App Store hostname pass through.
 * Anything else (a protocol downgrade, an unexpected host, a malformed
 * string, or no URL at all) falls back to the known-safe constant instead of
 * being opened as-is.
 */
const toSafeStoreUrl = (storeUrl?: string): string => {
  if (!storeUrl) {
    return FALLBACK_APP_STORE_URL;
  }

  try {
    const url = new URL(storeUrl);

    if (
      url.protocol === 'https:' &&
      ALLOWED_STORE_HOSTNAMES.has(url.hostname)
    ) {
      return storeUrl;
    }
  } catch {
    // Malformed URL — fall through to the fallback below.
  }

  return FALLBACK_APP_STORE_URL;
};

/** Opens the Mac App Store listing, falling back to the app's known store id. */
export const openAppStore = (storeUrl?: string): Promise<void> =>
  shell.openExternal(toSafeStoreUrl(storeUrl));
