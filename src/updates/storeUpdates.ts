import { app, shell } from 'electron';

import type { UpdateStore } from './common';

/**
 * Snapshot of `app.isPackaged` taken at module load, i.e. before
 * `setupUpdates` (src/updates/main.ts) can monkey-patch the getter to force
 * it `true` in development (needed to make electron-updater work locally).
 * The dev-simulation gate reads this instead of `app.isPackaged` directly so
 * it isn't defeated by that patch — this module is imported by main.ts above
 * the `setupUpdates` call, so the capture always runs first.
 */
const isActuallyPackaged = app.isPackaged;

/** Network timeout for store version-lookup requests. */
const LOOKUP_TIMEOUT_MS = 10_000;

export type StoreVersionInfo = {
  version: string;
  storeUrl: string;
};

/**
 * Whether the dev-simulation override (`ROCKETCHAT_SIMULATE_STORE`) should
 * take effect. Checked two independent ways so it can't be reactivated by
 * accident: `NODE_ENV === 'development'` (rollup.config.mjs bakes this in at
 * build time; release CI always sets `NODE_ENV=production`, see
 * .github/workflows/build-release.yml) and `isActuallyPackaged` (captured at
 * module load, before setupUpdates's dev-mode monkey-patch of
 * `app.isPackaged` can run — see the comment above `isActuallyPackaged`).
 * Requiring both means a local build that forgets to set
 * `NODE_ENV=production` still can't accidentally activate this in a real
 * packaged app.
 */
const isDevSimulationAllowed = (): boolean =>
  process.env.NODE_ENV === 'development' && !isActuallyPackaged;

const simulatedStore = (): UpdateStore => {
  if (!isDevSimulationAllowed()) {
    return null;
  }

  switch (process.env.ROCKETCHAT_SIMULATE_STORE) {
    case 'mas':
    case 'windows':
    case 'snap':
    case 'flatpak':
      return process.env.ROCKETCHAT_SIMULATE_STORE;
    default:
      return null;
  }
};

const fetchJson = async (
  url: string,
  headers?: Record<string, string>
): Promise<unknown | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal, headers });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

// ---------------------------------------------------------------------------
// mas — Mac App Store
// ---------------------------------------------------------------------------

/** Rocket.Chat's Mac App Store listing id, used when the lookup response omits its own link. */
const MAS_FALLBACK_URL = 'https://apps.apple.com/app/id1086818840';

const MAS_LOOKUP_URL = 'https://itunes.apple.com/lookup?bundleId=chat.rocket';

type ITunesLookupResult = {
  version?: unknown;
  trackViewUrl?: unknown;
};

type ITunesLookupResponse = {
  resultCount?: unknown;
  results?: unknown;
};

/** Hostnames the App Store deep link is allowed to point at. */
const MAS_ALLOWED_HOSTNAMES = new Set(['apps.apple.com', 'itunes.apple.com']);

/**
 * Validates a store URL before it's handed to `shell.openExternal`: only
 * `https:` URLs pointed at an Apple App Store hostname pass through.
 * Anything else (a protocol downgrade, an unexpected host, a malformed
 * string, or no URL at all) falls back to the known-safe constant instead of
 * being opened as-is. Only MAS fetches a remote URL (`trackViewUrl`); the
 * other stores use hardcoded constants below and never need this check.
 */
const toSafeMasUrl = (storeUrl?: string): string => {
  if (!storeUrl) {
    return MAS_FALLBACK_URL;
  }

  try {
    const url = new URL(storeUrl);

    if (url.protocol === 'https:' && MAS_ALLOWED_HOSTNAMES.has(url.hostname)) {
      return storeUrl;
    }
  } catch {
    // Malformed URL — fall through to the fallback below.
  }

  return MAS_FALLBACK_URL;
};

const fetchLatestMasVersion = async (): Promise<StoreVersionInfo | null> => {
  const data = (await fetchJson(MAS_LOOKUP_URL)) as ITunesLookupResponse | null;

  if (
    !data ||
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
      : MAS_FALLBACK_URL;

  return { version: result.version, storeUrl };
};

// ---------------------------------------------------------------------------
// windows — Microsoft Store
// ---------------------------------------------------------------------------

/**
 * Rocket.Chat's Microsoft Store listing. `ms-windows-store:` is the Store
 * app's own deep-link scheme — see
 * learn.microsoft.com/en-us/windows/apps/develop/launch/launch-store-app.
 * There is no unauthenticated version-lookup API (the DisplayCatalog API
 * requires auth — verified: an unauthenticated request returns HTTP 400), so
 * this store has no `fetchLatestVersion`; the Store app itself is the source
 * of truth once opened.
 */
const WINDOWS_STORE_URL = 'ms-windows-store://pdp/?ProductId=9nblggh52jv6';

// ---------------------------------------------------------------------------
// snap — Snap Store
// ---------------------------------------------------------------------------

/** Web listing (not `snap://`, which is not reliable across distros). */
const SNAP_STORE_URL = 'https://snapcraft.io/rocketchat-desktop';

const SNAP_INFO_URL =
  'https://api.snapcraft.io/v2/snaps/info/rocketchat-desktop';

type SnapChannelMapEntry = {
  channel?: { risk?: unknown; track?: unknown };
  version?: unknown;
};

type SnapInfoResponse = {
  'channel-map'?: unknown;
};

const fetchLatestSnapVersion = async (): Promise<StoreVersionInfo | null> => {
  const data = (await fetchJson(SNAP_INFO_URL, {
    'Snap-Device-Series': '16',
  })) as SnapInfoResponse | null;

  const channelMap = data?.['channel-map'];

  if (!Array.isArray(channelMap)) {
    return null;
  }

  const entries = channelMap as SnapChannelMapEntry[];

  const stableEntry =
    entries.find(
      (entry) =>
        entry.channel?.risk === 'stable' && entry.channel?.track === 'latest'
    ) ?? entries.find((entry) => entry.channel?.risk === 'stable');

  if (!stableEntry || typeof stableEntry.version !== 'string') {
    return null;
  }

  return { version: stableEntry.version, storeUrl: SNAP_STORE_URL };
};

// ---------------------------------------------------------------------------
// flatpak — Flathub
// ---------------------------------------------------------------------------

const FLATHUB_STORE_URL = 'https://flathub.org/apps/chat.rocket.RocketChat';

const FLATHUB_INFO_URL =
  'https://flathub.org/api/v2/appstream/chat.rocket.RocketChat';

type FlathubRelease = {
  version?: unknown;
};

type FlathubAppstreamResponse = {
  releases?: unknown;
};

const fetchLatestFlatpakVersion =
  async (): Promise<StoreVersionInfo | null> => {
    const data = (await fetchJson(
      FLATHUB_INFO_URL
    )) as FlathubAppstreamResponse | null;

    if (!data || !Array.isArray(data.releases) || data.releases.length === 0) {
      return null;
    }

    const [latest] = data.releases as FlathubRelease[];

    if (!latest || typeof latest.version !== 'string' || !latest.version) {
      return null;
    }

    return { version: latest.version, storeUrl: FLATHUB_STORE_URL };
  };

// ---------------------------------------------------------------------------
// Per-store adapter map
// ---------------------------------------------------------------------------

type StoreAdapter = {
  detect(): boolean;
  fetchLatestVersion?(): Promise<StoreVersionInfo | null>;
  storeUrl: string;
};

const STORE_ADAPTERS: Record<Exclude<UpdateStore, null>, StoreAdapter> = {
  mas: {
    detect: () => process.mas === true,
    fetchLatestVersion: fetchLatestMasVersion,
    storeUrl: MAS_FALLBACK_URL,
  },
  windows: {
    detect: () => process.windowsStore === true,
    // No fetchLatestVersion — see the comment above WINDOWS_STORE_URL.
    storeUrl: WINDOWS_STORE_URL,
  },
  snap: {
    detect: () => !!process.env.SNAP,
    fetchLatestVersion: fetchLatestSnapVersion,
    storeUrl: SNAP_STORE_URL,
  },
  flatpak: {
    detect: () => !!process.env.FLATPAK_ID,
    fetchLatestVersion: fetchLatestFlatpakVersion,
    storeUrl: FLATHUB_STORE_URL,
  },
};

/** Detection precedence when multiple markers are somehow present. */
const STORE_DETECTION_ORDER: Exclude<UpdateStore, null>[] = [
  'mas',
  'windows',
  'snap',
  'flatpak',
];

/**
 * Detects which store-distributed build this is, if any. Real store markers
 * are checked first (mas → windows → snap → flatpak); only if none match does
 * the dev-only `ROCKETCHAT_SIMULATE_STORE` override apply.
 */
export const detectUpdateStore = (): UpdateStore => {
  for (const store of STORE_DETECTION_ORDER) {
    if (STORE_ADAPTERS[store].detect()) {
      return store;
    }
  }

  return simulatedStore();
};

/**
 * Fetches the latest published version for the given store. Returns `null`
 * when the store has no version API (e.g. `windows`) or on any failure
 * (network error, timeout, no result, or a malformed response) — never
 * throws, so callers can fold it into their own error reporting.
 */
export const fetchLatestStoreVersion = async (
  store: Exclude<UpdateStore, null>
): Promise<StoreVersionInfo | null> => {
  const { fetchLatestVersion } = STORE_ADAPTERS[store];
  return fetchLatestVersion ? fetchLatestVersion() : null;
};

/**
 * Opens the given store's page/listing, falling back to its known constant
 * URL. `urlOverride` is only meaningful for `mas` (the one store with a
 * remote, per-lookup URL) and is validated through `toSafeMasUrl` before use;
 * the other stores always use their hardcoded constant.
 */
export const openStorePage = (
  store: Exclude<UpdateStore, null>,
  urlOverride?: string
): Promise<void> => {
  const url =
    store === 'mas'
      ? toSafeMasUrl(urlOverride)
      : STORE_ADAPTERS[store].storeUrl;
  return shell.openExternal(url);
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
 * Whether the store's published version is strictly newer than the local
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
